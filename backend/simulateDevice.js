const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api/device/device-data';

let TEST_PATIENT_USER_ID = process.argv[2] || null;

// Helper to generate a random number within a range
const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Initial normal baseline vitals
let currentHeartRate = 75;
let currentSpo2 = 98;
let currentTemperature = 37.0;

// To create occasional spikes/drops (abnormalities)
let abnormalityCounter = 0;

const generateData = () => {
    // 10% chance to generate an abnormal reading every 10 ticks minimum
    abnormalityCounter++;
    const isAbnormal = Math.random() < 0.1 && abnormalityCounter > 10;

    if (isAbnormal) {
        console.log('\n--- SIMULATING ABNORMAL EVENT ---');
        abnormalityCounter = 0; // Reset counter

        // Randomly pick which vital to make abnormal
        const anomalyType = Math.floor(Math.random() * 3);

        if (anomalyType === 0) {
            // High Heart Rate (Tachycardia over 100, or low under 60)
            currentHeartRate = Math.random() > 0.5 ? randomInRange(105, 120) : randomInRange(40, 55);
            currentSpo2 = randomInRange(95, 100); // Keep others normal
            currentTemperature = (randomInRange(365, 375) / 10);
        } else if (anomalyType === 1) {
            // Low SpO2 (Hypoxemia under 90)
            currentSpo2 = randomInRange(80, 89);
            currentHeartRate = randomInRange(60, 100); // Keep others normal
            currentTemperature = (randomInRange(365, 375) / 10);
        } else {
            // High Temperature (Fever over 38 C)
            currentTemperature = (randomInRange(380, 400) / 10);
            currentHeartRate = randomInRange(60, 100); // Keep others normal
            currentSpo2 = randomInRange(95, 100);
        }
    } else {
        // Normal fluctuations around the baseline
        currentHeartRate += randomInRange(-2, 2);
        // Clamp to normal ranges roughly
        if (currentHeartRate < 60) currentHeartRate = 60;
        if (currentHeartRate > 100) currentHeartRate = 100;

        currentSpo2 += randomInRange(-1, 1);
        if (currentSpo2 > 100) currentSpo2 = 100;
        if (currentSpo2 < 95) currentSpo2 = 95;

        currentTemperature += (randomInRange(-2, 2) / 10);
        if (currentTemperature < 36.1) currentTemperature = 36.1;
        if (currentTemperature > 37.5) currentTemperature = 37.5;
    }

    return {
        hr: currentHeartRate,
        spo2: currentSpo2,
        temp: parseFloat(currentTemperature.toFixed(1)),
        source: "simulated"
    };
};

let patientIds = [];

const sendData = async () => {
    const data = generateData();
    console.log(`[${new Date().toLocaleTimeString()}] Generating: HR=${data.hr}, SpO2=${data.spo2}%, Temp=${data.temp}°C`);

    for (const pid of patientIds) {
        try {
            await axios.post(`${API_URL}/${pid}`, data);
            // console.log(` -> Sent to Patient ${pid}`);
        } catch (error) {
            console.error(`Error sending to ${pid}:`, error.message);
        }
    }
};

// --- Main Startup ---
const startSimulation = async () => {
    if (!TEST_PATIENT_USER_ID) {
        console.log('No ID provided via args. Auto-fetching all patients from DB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/healthconnect');
        const Patient = require('./models/Patient');
        const patients = await Patient.find();
        
        if (patients.length > 0) {
            patientIds = patients.map(p => p.userId.toString());
            console.log(`Auto-selected Patient User IDs: \n - ${patientIds.join('\n - ')}`);
        } else {
            console.error('No patients found in DB. Please register one first.');
            process.exit(1);
        }
        await mongoose.disconnect();
    } else {
        patientIds = [TEST_PATIENT_USER_ID];
    }

    console.log(`Starting device simulation targeting: ${API_URL}/[patientId]`);
    console.log('Press Ctrl+C to stop.');

    setInterval(sendData, 1000);
    sendData();
}

startSimulation();
