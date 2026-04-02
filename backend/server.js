const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Connect to database
const connectDB = require('./config/db');
connectDB();

// Import report generation service
const { startReportGenerationService } = require('./services/reportGenerationService');

// Import routes
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const videoCallRoutes = require('./routes/videoCalls');
const healthStatsRoutes = require('./routes/healthStats');
const contactRoutes = require('./routes/contact');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const authExtRoutes = require('./routes/authExtRoutes');
const deviceDataRoutes = require('./routes/deviceData');
const symptomRoutes = require('./routes/symptoms');
const notificationRoutes = require('./routes/notifications');
const transactionRoutes = require('./routes/transactions');
const sosRoutes = require('./routes/sos');
const feedbackRoutes = require('./routes/feedback');
const reportRoutes = require('./routes/reports');
const analyticsRoutes = require('./routes/analytics');

// Initialize express app
const app = express();

// Initialize HTTP server and Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log('🟢 A client connected:', socket.id);

    // Allow clients to join rooms (like a 'doctor_123' room or 'patient_456' room)
    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`📍 Socket ${socket.id} joined room ${room}`);
    });

    socket.on('disconnect', () => {
        console.log('🔴 Client disconnected:', socket.id);
    });
});

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'HealthConnect API is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth/ext', authExtRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/device', deviceDataRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/video-calls', videoCallRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/health-stats', healthStatsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);

// --- Backward Compatibility for Frontend MyStats.jsx ---
// The frontend polls GET /data without auth/patientId. 
// We return the absolutely most recent reading in the DB.
app.get('/data', async (req, res) => {
    try {
        const HealthReading = require('./models/HealthReading');
        const latest = await HealthReading.findOne().sort({ timestamp: -1 });
        if (latest) {
            res.json({
                hr: latest.heartRate,
                spo2: latest.spo2,
                temp: latest.temperature
            });
        } else {
            res.json({ hr: null, spo2: null, temp: null });
        }
    } catch (error) {
        console.error('Error serving /data:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║         🏥 HealthConnect API Server                  ║
║                                                       ║
║         Server running on port ${PORT}                   ║
║         Environment: ${process.env.NODE_ENV || 'development'}                    ║
║         Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}        ║
║                                                       ║
║         API Endpoints:                                ║
║         - GET  /api/health                            ║
║         - GET  /api/doctors                           ║
║         - POST /api/appointments                      ║
║         - POST /api/video-calls                       ║
║         - GET  /api/health-stats                      ║
║         - POST /api/contact                           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);

    // Start automatic report generation service
    startReportGenerationService(io);

    // --- 📥 IoT Serial Monitor Integration ---
    const { SerialPort } = require('serialport');
    const { ReadlineParser } = require('@serialport/parser-readline');
    const HealthReading = require('./models/HealthReading');
    const Patient = require('./models/Patient');

    const initializeSerial = async () => {
        try {
            console.log('🔌 Initializing IoT Serial Monitor on COM3 (115200 baud)...');
            
            const port = new SerialPort({ 
                path: 'COM3', 
                baudRate: 115200,
                autoOpen: false 
            });

            const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

            port.open((err) => {
                if (err) {
                    console.warn(`⚠️ Serial Port Warning: ${err.message}`);
                    console.log('💡 Note: Server started without hardware. IoT stats will be offline.');
                    return;
                }
                console.log('✅ IoT Serial Monitor Active. Ready for real-time readings.');
            });

            parser.on('data', async (raw) => {
                try {
                    const data = raw.trim();
                    if (!data || !data.startsWith('{')) return;

                    const json = JSON.parse(data);
                    const hr = json.hr || 0;
                    const spo2 = json.spo2 || 0;
                    const temp = json.temp || 0;

                    // Broadcast to ALL connected clients immediately
                    const payload = {
                        ...json,
                        timestamp: Date.now(),
                        source: 'hardware'
                    };

                    io.emit('vitalsUpdate', payload);
                    io.emit('global_stream_data', payload); // Compatibility
                    io.emit('live_health_data', payload);   // Compatibility

                    // Save to Database (First Patient as default for hardware)
                    const p = await Patient.findOne();
                    if (p) {
                        const { checkAbnormalities } = require('./services/alertService');
                        
                        await HealthReading.create({
                            patientId: p._id, // Fixed: should be patientId object ref
                            heartRate: hr,
                            spo2: spo2,
                            temperature: temp,
                            timestamp: new Date(),
                            source: 'hardware'
                        });

                        // ✅ CRITICAL: Trigger Alert Logic
                        await checkAbnormalities(p.userId, { hr, spo2, temp }, io);
                    }

                } catch (err) {
                    // Silent fail for malformed serial data (common on startup)
                }
            });

            port.on('error', (err) => console.error('⚠️ Serial Error:', err.message));
            port.on('close', () => {
                console.log('🔌 Serial Connection Closed. Retrying in 5s...');
                setTimeout(initializeSerial, 5000);
            });

        } catch (err) {
            console.error('❌ Serial Initialization Failed:', err.message);
        }
    };

    initializeSerial();
});

module.exports = { app, server };
