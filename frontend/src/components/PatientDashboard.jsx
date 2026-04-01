import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import io from 'socket.io-client';
import api from '../services/api';
import Chatbot from './Chatbot';

const SOCKET_URL = 'http://localhost:5000';

const THRESHOLDS = {
    hr: { low: 60, high: 100, unit: 'bpm' },
    spo2: { low: 94, high: 100, unit: '%' },
    temp: { low: 35, high: 38, unit: '°C' },
};

const VitalCard = ({ label, value, unit, icon, low, high }) => {
    const num = parseFloat(value);
    const isLow = !isNaN(num) && num < low;
    const isHigh = !isNaN(num) && num > high;
    const isCritical = isLow || isHigh;

    const bgColor = isCritical ? 'bg-red-50 border-red-300' : 'bg-white border-gray-100';
    const valColor = isCritical ? 'text-red-600' : 'text-gray-800';

    return (
        <div className={`p-6 rounded-2xl shadow border-2 flex items-center justify-between ${bgColor} transition-all`}>
            <div>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
                <h3 className={`text-3xl font-bold ${valColor}`}>
                    {value === '--' ? '--' : value}
                    <span className="text-base text-gray-400 font-normal ml-1">{unit}</span>
                </h3>
                {isCritical && (
                    <p className="text-red-500 text-xs font-semibold mt-1 animate-pulse">
                        {isLow ? `⬇ Below normal (<${low}${unit})` : `⬆ Above normal (>${high}${unit})`}
                    </p>
                )}
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${isCritical ? 'bg-red-100' : 'bg-blue-50'}`}>
                {icon}
            </div>
        </div>
    );
};

const PatientDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [vitals, setVitals] = useState({ hr: '--', spo2: '--', temp: '--' });
    const [alerts, setAlerts] = useState([]);     // recent alert history
    const [sosActive, setSosActive] = useState(null);   // { message, severity }
    const [sosLoading, setSosLoading] = useState(false);
    const [sosSuccess, setSosSuccess] = useState(null);

    // Dismiss SOS banner after 15s
    useEffect(() => {
        if (!sosActive) return;
        const t = setTimeout(() => setSosActive(null), 15000);
        return () => clearTimeout(t);
    }, [sosActive]);

    // Manual SOS button handler
    const handleManualSOS = useCallback(async () => {
        setSosLoading(true);
        setSosSuccess(null);
        try {
            const { data } = await api.post('/sos/trigger');
            setSosSuccess(data.message);
        } catch (err) {
            setSosSuccess('SOS failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setSosLoading(false);
        }
    }, []);

    // --- Feedback / Escalation Loop ---
    const [feedbackAlert, setFeedbackAlert] = useState(null);
    const [countdown, setCountdown] = useState(15);

    useEffect(() => {
        let timer;
        if (feedbackAlert && countdown > 0) {
            timer = setInterval(() => setCountdown(c => c - 1), 1000);
        } else if (feedbackAlert && countdown <= 0) {
            setFeedbackAlert(null);
            setSosActive({
                message: "No response within 15 seconds. Emergency SOS Dispatched!",
                severity: "critical"
            });
        }
        return () => clearInterval(timer);
    }, [feedbackAlert, countdown]);

    useEffect(() => {
        if (!user) return;
        
        console.log(`🔌 PatientDashboard connecting to Socket.io at ${SOCKET_URL}`);
        const socket = io(SOCKET_URL, { 
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });
        
        socket.on('connect', () => {
            console.log('✅ Socket.io Connected for PatientDashboard - ID:', socket.id);
            socket.emit('join_room', user._id);
            console.log(`📍 PatientDashboard joined room: ${user._id}`);
        });

        socket.on('connect_error', (error) => {
            console.error('🔴 Patient Dashboard Connection Error:', error);
        });

        // REAL-TIME Vitals - Using global stream for exact device matching
        socket.on('global_stream_data', (data) => {
            console.log('[✅ PatientDashboard RECEIVED global_stream_data]', data);
            setVitals({ hr: data.hr, spo2: data.spo2, temp: data.temp });
        });

        // Feedback / Alert hooks remain on targetted private room
        socket.on('feedback_request', (payload) => {
            console.log('[🚨 PatientDashboard RECEIVED feedback_request]', payload);
            setFeedbackAlert(payload);
            setCountdown(15);
        });

        return () => {
            console.log('🔌 PatientDashboard cleaning up Socket.io connection');
            socket.disconnect();
        };
    }, [user]);

    const handleFeedbackResponse = async (isOkay) => {
        if (!feedbackAlert) return;
        const currentAlertId = feedbackAlert.alertId;
        setFeedbackAlert(null);
        try {
            await api.post('/device/alert-response', {
                alertId: currentAlertId,
                isOkay
            });
            if (!isOkay) {
                setSosActive({
                    message: "Emergency SOS Triggered! Help is on the way.",
                    severity: "critical"
                });
            }
        } catch (error) {
            console.error("Failed to send alert response", error);
        }
    };

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%)' }}>

            {/* ── Critical SOS Banner ─────────────────────────────── */}
            {sosActive && (
                <div className={`fixed top-0 inset-x-0 z-50 px-6 py-4 text-white text-center shadow-2xl animate-bounce
                    ${sosActive.severity === 'critical' ? 'bg-red-600' : 'bg-orange-500'}`}>
                    <div className="flex items-center justify-center gap-3 max-w-3xl mx-auto">
                        <span className="text-2xl">🚨</span>
                        <p className="font-bold text-lg">{sosActive.message}</p>
                        <button onClick={() => setSosActive(null)} className="ml-auto text-white/70 hover:text-white text-xl">✕</button>
                    </div>
                </div>
            )}

            {/* ── Feedback / Escalation Modal ─────────────────────────────── */}
            {feedbackAlert && (
                <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 flex flex-col items-center text-center
                        transform transition-all animate-pulse border-red-500">
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-5xl mb-4">
                            🚨
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 mb-2">ARE YOU OKAY?</h2>
                        <p className="text-red-600 font-bold mb-4">{feedbackAlert.message}</p>
                        
                        <div className="bg-gray-100 w-full rounded-2xl p-4 mb-6">
                            <p className="text-sm text-gray-600 mb-2 font-medium">Automatic Emergency Escalation in:</p>
                            <div className="text-5xl font-black text-red-600 tracking-tighter shadow-sm">{countdown}s</div>
                        </div>

                        <div className="flex flex-col gap-3 w-full">
                            <button 
                                onClick={() => handleFeedbackResponse(true)}
                                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl text-xl shadow-lg transition-transform active:scale-95"
                            >
                                ✅ YES, I AM OKAY
                            </button>
                            <button 
                                onClick={() => handleFeedbackResponse(false)}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl text-xl shadow-lg transition-transform active:scale-95"
                            >
                                🚑 NO, I NEED HELP NOW
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Navbar ──────────────────────────────────────────── */}
            <nav className="bg-white shadow-sm sticky top-0 z-10 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 rounded-xl p-2">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <span className="font-black text-gray-900">HealthConnect</span>
                    <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">Patient Portal</span>
                </div>

                {/* Quick Nav Links */}
                <div className="hidden md:flex items-center space-x-2">
                    {[
                        { to: '/appointment', label: '📅 Book Appointment' },
                        { to: '/videocall',   label: '📹 Video Consult' },
                        { to: '/mystats',     label: '📈 Historical Stats' },
                    ].map(({ to, label }) => (
                        <Link key={to} to={to}
                            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition">
                            {label}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-600">👤 {user?.name}</span>
                    <button onClick={() => { logout(); navigate('/login'); }}
                        className="text-sm text-red-500 hover:text-red-700 font-semibold">Logout</button>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 py-8">

                {/* ── Greeting ─────────────────────────────────────── */}
                <div className="mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0]} 👋</h1>
                        <p className="text-gray-500 text-sm mt-1">Your real-time health monitoring dashboard</p>
                    </div>
                    {/* Action Cards */}
                    <div className="flex space-x-3">
                        <Link to="/mystats" className="bg-white shadow-sm border border-gray-200 rounded-xl p-3 hover:shadow-md transition text-center min-w-[100px]">
                            <div className="text-2xl mb-1">📈</div>
                            <div className="text-xs font-bold text-gray-700">Health History</div>
                        </Link>
                        <Link to="/appointment" className="bg-white shadow-sm border border-gray-200 rounded-xl p-3 hover:shadow-md transition text-center min-w-[100px]">
                            <div className="text-2xl mb-1">📅</div>
                            <div className="text-xs font-bold text-gray-700">Appointments</div>
                        </Link>
                        <Link to="/videocall" className="bg-white shadow-sm border border-gray-200 rounded-xl p-3 hover:shadow-md transition text-center min-w-[100px]">
                            <div className="text-2xl mb-1">📹</div>
                            <div className="text-xs font-bold text-gray-700">Video Call</div>
                        </Link>
                    </div>
                </div>

                {/* ── Vitals Cards ─────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    <VitalCard label="Heart Rate" value={vitals.hr} icon="❤️"
                        unit={THRESHOLDS.hr.unit} low={THRESHOLDS.hr.low} high={THRESHOLDS.hr.high} />
                    <VitalCard label="Oxygen (SpO₂)" value={vitals.spo2} icon="💨"
                        unit={THRESHOLDS.spo2.unit} low={THRESHOLDS.spo2.low} high={THRESHOLDS.spo2.high} />
                    <VitalCard label="Temperature" value={vitals.temp} icon="🌡️"
                        unit={THRESHOLDS.temp.unit} low={THRESHOLDS.temp.low} high={THRESHOLDS.temp.high} />
                </div>

                {/* ── Threshold Legend ─────────────────────────────── */}
                <div className="mb-8 bg-white rounded-2xl shadow p-4 border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">Normal Ranges</h3>
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        {[
                            { label: 'Heart Rate', range: '60 – 100 bpm', icon: '❤️' },
                            { label: 'SpO₂', range: '94 – 100%', icon: '💨' },
                            { label: 'Temperature', range: '35 – 38°C', icon: '🌡️' },
                        ].map(({ label, range, icon }) => (
                            <div key={label} className="flex flex-col items-center gap-1">
                                <span className="text-xl">{icon}</span>
                                <span className="font-semibold text-gray-700">{label}</span>
                                <span className="text-green-600 font-bold">{range}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Manual SOS Button ────────────────────────────── */}
                <div className="flex flex-col items-center mb-8">
                    <button
                        onClick={handleManualSOS}
                        disabled={sosLoading}
                        className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xl py-5 px-16
                            rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center gap-3
                            disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {sosLoading ? (
                            <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : <span>🚨</span>}
                        {sosLoading ? 'Sending SOS...' : 'Emergency SOS'}
                    </button>
                    {sosSuccess && (
                        <p className={`mt-3 text-sm font-semibold ${sosSuccess.includes('failed') ? 'text-red-600' : 'text-green-600'}`}>
                            {sosSuccess}
                        </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">Sends an SMS alert to your emergency contact immediately</p>
                </div>

                {/* ── Alert History ─────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-bold text-gray-900">Alert History</h2>
                        <span className="text-xs text-gray-400">{alerts.length} alerts this session</span>
                    </div>
                    {alerts.length === 0 ? (
                        <div className="p-10 text-center text-gray-400">
                            <p className="text-3xl mb-2">✅</p>
                            <p className="font-medium">All vitals normal — no alerts</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {alerts.map((a, i) => (
                                <li key={i} className={`px-5 py-4 flex items-start gap-3 ${a.severity === 'critical' ? 'bg-red-50' : 'bg-orange-50'}`}>
                                    <span className="text-xl mt-0.5">{a.severity === 'critical' ? '🚨' : '⚠️'}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">{a.message}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{a.time?.toLocaleTimeString()}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full self-start
                                        ${a.severity === 'critical' ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'}`}>
                                        {a.type}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </main>

            {/* Floating Chatbot */}
            <Chatbot />
        </div>
    );
};

export default PatientDashboard;
