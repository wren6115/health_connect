const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api/device/device-data';
const STATUS_URL = 'http://localhost:5000/api/device/status'; // Optional status endpoint

// TEST MODE: Run with: npm run serial-bridge -- --test
const TEST_MODE = process.argv.includes('--test');

let patientUserId = null;
let port = null;
let parser = null;
let isConnecting = false;

// 1. Fetch Patient ID
const getPatientId = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/healthconnect');
        const Patient = require('./models/Patient');
        const p = await Patient.findOne();
        if (p) {
            patientUserId = p.userId.toString();
            console.log(`✅ Bridge mapped to Patient User ID: ${patientUserId}`);
        } else {
            console.error('❌ No patient found in DB. Please register one first.');
            process.exit(1);
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ DB Error:', err.message);
        process.exit(1);
    }
};

// 2. Connect to COM3 with correct baud rate
const connectToDevice = async () => {
    if (isConnecting || port?.isOpen) return;
    isConnecting = true;

    try {
        // Try to list available ports for debugging
        const ports = await SerialPort.list();
        
        // Check if COM3 is available
        const com3Port = ports.find(p => p.path === 'COM3');

        if (!com3Port) {
            process.stdout.write('\r⏳ Scanning for IoT device on COM3...       ');
            isConnecting = false;
            setTimeout(connectToDevice, 2000);
            return;
        }

        console.log(`\n🔌 Connected to COM3 (${com3Port.manufacturer})`);
        
        // Baud rate MUST match Arduino code.ino (115200)
        port = new SerialPort({ path: 'COM3', baudRate: 115200 });
        parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

        port.on('open', () => {
            console.log('✅ Serial connection established. Reading data...');
            // Optional: send HTTP POST to set status = connected
        });

        parser.on('data', async (data) => {
            try {
                const cleanData = data.trim();
                console.log("🔥 RAW DATA FROM ESP:", data);
                // Ignore empty lines or non-JSON debug logs
                if (!cleanData.startsWith('{') || !cleanData.endsWith('}')) {
                    console.log(`[DEBUG] Non-JSON data received: ${cleanData}`);
                    return;
                }

                // 3. Strict JSON Parsing 
                const vitals = JSON.parse(cleanData);
                
                // Handle null values from Arduino when no finger present
                const hr = (vitals.hr !== null) ? vitals.hr : 0;
                const spo2 = vitals.spo2 || 0;
                const temp = vitals.temp || 0;

                // 4. Client-side sanity validation
                if (hr < 40 || hr > 200) throw new Error(`Invalid HR: ${hr}`);
                if (spo2 < 50 || spo2 > 100) throw new Error(`Invalid SpO2: ${spo2}`);
                if (temp < 30 || temp > 45) throw new Error(`Invalid Temp: ${temp}`);

                // Log the exact status for manual verification
                console.log(`[${new Date().toLocaleTimeString()}] 📡 IoT -> Dashboard: HR:${hr} | SpO2:${spo2}% | Temp:${temp}°C`);
                
                // 5. Send to Server Pipeline
                await axios.post(`${API_URL}/${patientUserId}`, {
                    hr: hr,
                    spo2: spo2,
                    temp: temp,
                    timestamp: vitals.timestamp || Date.now(),
                    source: "hardware" // Explicitly tag as hardware
                });
                
            } catch (err) {
                // If parsing fails or data is invalid, we log it without crashing the bridge
                console.error(`⚠️ Discarded corrupt data: ${data.trim()} | Reason: ${err.message}`);
            }
        });

        port.on('close', () => {
            console.log('\n❌ USB Cable Unplugged. Connection Lost.');
            port = null;
            isConnecting = false;
            // Enter auto-reconnect loop
            setTimeout(connectToDevice, 2000);
        });

        port.on('error', (err) => {
            console.error('\n⚠️ Serial Port Error:', err.message);
            port = null;
            isConnecting = false;
            setTimeout(connectToDevice, 2000);
        });

    } catch (err) {
        console.error('Connection Exception:', err.message);
        isConnecting = false;
        setTimeout(connectToDevice, 2000);
    }
};

// Test/Simulation Mode (for debugging when Arduino isn't available)
const simulateData = () => {
    console.log('\n🧪 TEST MODE: Simulating Arduino data...\n');
    
    let hr = 72;
    let spo2 = 96;
    let temp = 36.5;
    
    const sendTestData = async () => {
        try {
            // Simulate realistic vital signs variations
            hr = Math.max(60, Math.min(100, hr + (Math.random() - 0.5) * 4));
            spo2 = Math.max(92, Math.min(100, spo2 + (Math.random() - 0.5) * 2));
            temp = Math.max(36.0, Math.min(37.5, temp + (Math.random() - 0.5) * 0.2));

            const hrFixed = Math.round(hr * 10) / 10;
            const spo2Fixed = Math.round(spo2 * 10) / 10;
            const tempFixed = Math.round(temp * 100) / 100;

            console.log(`[${new Date().toLocaleTimeString()}] 📡 [TEST] HR:${hrFixed} | SpO2:${spo2Fixed}% | Temp:${tempFixed}°C`);

            // Send to backend
            await axios.post(`${API_URL}/${patientUserId}`, {
                hr: hrFixed,
                spo2: spo2Fixed,
                temp: tempFixed,
                timestamp: Date.now(),
                source: "test_simulation"
            });
        } catch (err) {
            console.error(`⚠️ Test Data Error: ${err.message}`);
        }
    };

    // Send every second
    setInterval(sendTestData, 1000);
};

// Startup Sequence
console.log('=============================================');
console.log('      HEALTHCONNECT IoT SERIAL BRIDGE        ');
console.log('=============================================');

if (TEST_MODE) {
    console.log('🧪 TEST MODE ENABLED (--test flag detected)');
    getPatientId().then(() => simulateData());
} else {
    getPatientId().then(() => connectToDevice());
}
