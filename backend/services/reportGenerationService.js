const HealthReading = require('../models/HealthReading');
const HealthReport = require('../models/HealthReport');
const Patient = require('../models/Patient');

// Thresholds for anomalies
const THRESHOLDS = {
    heartRate: { min: 60, max: 100 },
    spo2: { min: 94, max: 100 },
    temperature: { min: 36, max: 37.5 }
};

/**
 * Generate automatic summary report from vitals data
 * Aggregates the past 60 seconds of health readings
 */
const generateAutoReport = async (patientId, io) => {
    try {
        // Get all readings from past 60 seconds
        const sixtySecondsAgo = new Date(Date.now() - 60000);
        
        const readings = await HealthReading.find({
            patientId: patientId,
            timestamp: { $gte: sixtySecondsAgo }
        }).sort({ timestamp: -1 });

        if (readings.length === 0) {
            // No data to report
            return null;
        }

        // Calculate aggregations
        const heartRates = readings.map(r => r.heartRate);
        const spo2Values = readings.map(r => r.spo2);
        const temperatures = readings.map(r => r.temperature);

        const avgHeartRate = (heartRates.reduce((a, b) => a + b, 0) / heartRates.length).toFixed(1);
        const avgSpO2 = (spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length).toFixed(1);
        const avgTemperature = (temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(1);

        const minHeartRate = Math.min(...heartRates);
        const maxHeartRate = Math.max(...heartRates);

        // Detect anomalies
        const anomalies = {
            abnormalHR: avgHeartRate < THRESHOLDS.heartRate.min || avgHeartRate > THRESHOLDS.heartRate.max,
            abnormalSpO2: avgSpO2 < THRESHOLDS.spo2.min,
            abnormalTemp: avgTemperature < THRESHOLDS.temperature.min || avgTemperature > THRESHOLDS.temperature.max,
            details: []
        };

        if (anomalies.abnormalHR) {
            const msg = avgHeartRate < THRESHOLDS.heartRate.min 
                ? `Low heart rate detected: ${avgHeartRate} bpm`
                : `High heart rate detected: ${avgHeartRate} bpm`;
            anomalies.details.push(msg);
        }

        if (anomalies.abnormalSpO2) {
            anomalies.details.push(`Low SpO2 detected: ${avgSpO2}%`);
        }

        if (anomalies.abnormalTemp) {
            const msg = avgTemperature < THRESHOLDS.temperature.min
                ? `Low temperature detected: ${avgTemperature}°C`
                : `High temperature detected: ${avgTemperature}°C`;
            anomalies.details.push(msg);
        }

        // Create report
        const report = await HealthReport.create({
            patientId: patientId,
            reportType: 'auto',
            aggregatedVitals: {
                avgHeartRate: parseFloat(avgHeartRate),
                avgSpO2: parseFloat(avgSpO2),
                avgTemperature: parseFloat(avgTemperature),
                minHeartRate,
                maxHeartRate,
                readingsCount: readings.length
            },
            anomalies: anomalies,
            reportPeriod: {
                startTime: readings[readings.length - 1].timestamp,
                endTime: readings[0].timestamp
            }
        });

        // Broadcast report via WebSocket (optional)
        if (io) {
            io.to(patientId.toString()).emit('health_report_generated', {
                reportId: report._id,
                patientId: patientId,
                aggregatedVitals: report.aggregatedVitals,
                anomalies: report.anomalies,
                timestamp: report.createdAt
            });

            // Notify doctors/admins if anomalies detected
            if (anomalies.abnormalHR || anomalies.abnormalSpO2 || anomalies.abnormalTemp) {
                io.to('admin_and_doctors').emit('alert_report_generated', {
                    reportId: report._id,
                    patientId: patientId,
                    severity: anomalies.details.length > 1 ? 'high' : 'medium',
                    anomalies: anomalies.details
                });
            }
        }

        console.log(`✅ Report generated for patient ${patientId}: ${readings.length} readings aggregated`);
        return report;
    } catch (error) {
        console.error('❌ Error generating auto-report:', error.message);
        return null;
    }
};

/**
 * Start the automatic report generation service
 * Runs every 60 seconds for each active patient
 */
const startReportGenerationService = async (io) => {
    console.log('🚀 Starting automatic report generation service...');

    // Get all patients
    const patients = await Patient.find();
    
    if (patients.length === 0) {
        console.log('⚠️ No patients found. Report service will wait.');
    } else {
        console.log(`📊 Report service initialized for ${patients.length} patient(s)`);
    }

    // Generate reports every 60 seconds for each patient
    setInterval(async () => {
        for (const patient of patients) {
            await generateAutoReport(patient._id, io);
        }
    }, 60000); // 60 seconds
};

module.exports = {
    generateAutoReport,
    startReportGenerationService
};
