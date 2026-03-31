const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api/device/device-data';
const STATUS_URL = 'http://localhost:5000/api/device/status'; // Optional status endpoint

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

// 2. Auto-Detect and Connect Logic
const connectToDevice = async () => {
    if (isConnecting || port?.isOpen) return;
    isConnecting = true;

    try {
        const ports = await SerialPort.list();
        
        // Scan for common Arduino / ESP chips (CH340, CP2102, FTDI, Silicon Labs, etc)
        const arduinoPortInfo = ports.find(p => 
            p.manufacturer?.toLowerCase().includes('arduino') || 
            p.manufacturer?.toLowerCase().includes('silicon labs') || 
            p.manufacturer?.toLowerCase().includes('wch') || // CH340
            p.manufacturer?.toLowerCase().includes('ftdi')
        );

        if (!arduinoPortInfo) {
            process.stdout.write('\r⏳ Scanning for IoT devices on USB ports...       ');
            isConnecting = false;
            setTimeout(connectToDevice, 2000);
            return;
        }

        console.log(`\n🔌 Auto-Detected Device on ${arduinoPortInfo.path} (${arduinoPortInfo.manufacturer})`);
        
        // Ensure baud rate matches Arduino: 115200 is modern standard, but 9600 works too. We'll use 9600 to match the provided sketch.
        port = new SerialPort({ path: arduinoPortInfo.path, baudRate: 9600 });
        parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

        port.on('open', () => {
            console.log('✅ Serial connection established. Reading data...');
            // Optional: send HTTP POST to set status = connected
        });

        parser.on('data', async (data) => {
            try {
                const cleanData = data.trim();
                
                // Ignore empty lines or non-JSON debug logs
                if (!cleanData.startsWith('{') || !cleanData.endsWith('}')) return; 

                // 3. Strict JSON Parsing 
                const vitals = JSON.parse(cleanData);
                
                // Use the heartRate key as per the high-accuracy standard
                const hr = vitals.heartRate || vitals.hr || 0;
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

// Startup Sequence
console.log('=============================================');
console.log('      HEALTHCONNECT IoT SERIAL BRIDGE        ');
console.log('=============================================');
getPatientId().then(() => connectToDevice());
