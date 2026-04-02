import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
// ✅ FIX 1: Use the shared singleton — do NOT call io() directly here.
// Calling io() again creates a second competing WebSocket connection.
import socket, { joinRoom, playAlertBeep } from '../services/socketService';
import api from '../services/api';
import Chatbot from './Chatbot';

// ─── Threshold values (must mirror backend alertService.js THRESHOLDS) ──────
const THRESHOLDS = {
    hr: { low: 50, high: 100, unit: 'bpm' },
    spo2: { low: 92, high: 100, unit: '%' },
    temp: { low: 35.0, high: 38.0, unit: '°C' },
};

// ─── VitalCard component ─────────────────────────────────────────────────────
const VitalCard = ({ label, value, unit, icon, low, high }) => {
    const num = parseFloat(value);
    const isLow = !isNaN(num) && num > 0 && num < low;
    const isHigh = !isNaN(num) && num > 0 && num > high;
    const isCritical = isLow || isHigh;

    return (
        <div className={`p-6 rounded-2xl shadow border-2 flex items-center justify-between transition-all duration-300
            ${isCritical ? 'bg-red-50 border-red-400 shadow-red-200' : 'bg-white border-gray-100'}`}>
            <div className="flex-1">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
                <h3 className={`text-3xl font-bold ${isCritical ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
                    {value === '--' || value === 0 ? '--' : value}
                    <span className="text-base text-gray-400 font-normal ml-1">{unit}</span>
                </h3>
                {isCritical && (
                    <p className="text-red-500 text-xs font-semibold mt-1">
                        {isLow ? `⬇ Below normal (<${low}${unit})` : `⬆ Above normal (>${high}${unit})`}
                    </p>
                )}
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
                ${isCritical ? 'bg-red-100 animate-bounce' : 'bg-blue-50'}`}>
                {icon}
            </div>
        </div>
    );
};

// ─── PatientDashboard ────────────────────────────────────────────────────────
const PatientDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    // ── Vitals state
    const [vitals, setVitals] = useState({ hr: '--', spo2: '--', temp: '--' });
    const [connectionStatus, setConnectionStatus] = useState(socket.connected ? 'connected' : 'connecting');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [latencyMs, setLatencyMs] = useState(null);

    // ── Alert history (populated every time feedback_request fires) ── FIX 4
    const [alerts, setAlerts] = useState([]);

    // ── SOS states
    const [sosActive, setSosActive] = useState(null);
    const [sosLoading, setSosLoading] = useState(false);
    const [sosSuccess, setSosSuccess] = useState(null);

    // ── Feedback modal & countdown
    const [feedbackAlert, setFeedbackAlert] = useState(null);
    const [countdown, setCountdown] = useState(15);

    // ── Auto-dismiss SOS banner after 15s ────────────────────────────────────
    useEffect(() => {
        if (!sosActive) return;
        const t = setTimeout(() => setSosActive(null), 15_000);
        return () => clearTimeout(t);
    }, [sosActive]);

    // ── Countdown timer for feedback modal ───────────────────────────────────
    // FIX 3: Use countdown as the ONLY dependency (not feedbackAlert object reference)
    // This prevents the timer from resetting when parent re-renders with a new object ref
    useEffect(() => {
        if (!feedbackAlert) return;
        if (countdown <= 0) {
            setFeedbackAlert(null);
            setSosActive({
                message: '⏱ No response in 15 seconds — Emergency SOS dispatched automatically!',
                severity: 'critical',
            });
            playAlertBeep('critical');
            return;
        }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [feedbackAlert, countdown]);

    // ── Socket.IO event listeners ────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;

        console.log('%c🔌 [PatientDashboard] Using shared singleton socket', 'color: #818cf8;');

        // Join the patient's personal room via the idempotent joinRoom helper
        joinRoom(user._id);
        setConnectionStatus(socket.connected ? 'connected' : 'connecting');

        // ── Event handlers ────────────────────────────────────────────────────
        const onConnect = () => {
            console.log('%c✅ [PatientDashboard] Socket connected/reconnected', 'color: #22c55e;');
            setConnectionStatus('connected');
            joinRoom(user._id); // Re-join on reconnect
        };

        const onDisconnect = () => {
            console.warn('%c❌ [PatientDashboard] Socket disconnected', 'color: #ef4444;');
            setConnectionStatus('disconnected');
        };

        const onConnectError = (error) => {
            console.error('%c🔴 [PatientDashboard] Socket connection error:', 'color: #ef4444;', error.message);
            setConnectionStatus('disconnected');
        };

        // Real-time vitals — global broadcast fires for every device reading
        const onGlobalStream = (data) => {
            const now = Date.now();
            const sent = data.timestamp ? new Date(data.timestamp).getTime() : now;
            const latency = now - sent;

            console.log(
                `%c✅ [PatientDashboard] global_stream_data | HR:${data.hr} SpO2:${data.spo2} Temp:${data.temp} | Latency:${latency}ms`,
                'color:#4ade80; font-weight:bold;'
            );

            setVitals({
                // Use ?? (nullish coalescing) not || to allow real 0 values
                hr: data.hr ?? '--',
                spo2: data.spo2 ?? '--',
                temp: data.temp ?? '--',
            });
            setLastUpdate(new Date().toLocaleTimeString());
            setLatencyMs(latency);
        };

        // Abnormal alert from backend — fires BEFORE DB write (low-latency path)
        const onFeedbackRequest = (payload) => {
            console.log('%c🚨 [PatientDashboard] feedback_request received', 'color:#f87171; font-weight:bold;', payload);

            // ✅ FIX 2: Play alert sound immediately — no waiting for UI render
            playAlertBeep(payload.severity === 'critical' ? 'critical' : 'warning');

            // Show the "Are you okay?" modal
            setFeedbackAlert(payload);
            setCountdown(15);

            // ✅ FIX 4: Append to alert history (this was completely missing before)
            setAlerts(prev => [{
                message: payload.message,
                severity: payload.severity,
                type: payload.alert?.type || 'Health Alert',
                vitals: payload.vitalsSnapshot,
                time: new Date(),
            }, ...prev].slice(0, 20)); // Keep last 20 alerts per session
        };

        // Backend confirms SOS was dispatched after escalation
        const onSosActivated = (data) => {
            console.log('%c🚨 [PatientDashboard] sos_activated from backend', 'color:#dc2626; font-weight:bold;', data);
            playAlertBeep('critical');
            setSosActive({
                message: data.message || '🚨 Emergency SOS has been dispatched. Help is on the way!',
                severity: 'critical',
            });
        };

        // ── Attach all listeners to the shared singleton ──────────────────────
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);
        socket.on('global_stream_data', onGlobalStream);
        socket.on('live_health_data', onGlobalStream); // same handler — patient-room fallback
        socket.on('feedback_request', onFeedbackRequest);
        socket.on('sos_activated', onSosActivated);

        // ── Cleanup: remove ONLY our named handlers — DO NOT disconnect! ──────
        // socket.disconnect() would kill the singleton for ALL components.
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('global_stream_data', onGlobalStream);
            socket.off('live_health_data', onGlobalStream);
            socket.off('feedback_request', onFeedbackRequest);
            socket.off('sos_activated', onSosActivated);
            console.log('🧹 [PatientDashboard] Socket listeners removed');
        };
    }, [user]);

    // ── Manual SOS ───────────────────────────────────────────────────────────
    const handleManualSOS = useCallback(async () => {
        setSosLoading(true);
        setSosSuccess(null);
        playAlertBeep('critical');
        try {
            const { data } = await api.post('/sos/trigger');
            setSosSuccess(data.message);
            setSosActive({ message: data.message, severity: 'critical' });
        } catch (err) {
            setSosSuccess('SOS failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setSosLoading(false);
        }
    }, []);

    // ── Alert modal response ─────────────────────────────────────────────────
    const handleFeedbackResponse = async (isOkay) => {
        if (!feedbackAlert) return;
        const currentAlertId = feedbackAlert.alertId;
        setFeedbackAlert(null);
        try {
            await api.post('/device/alert-response', { alertId: currentAlertId, isOkay });
            if (!isOkay) {
                setSosActive({ message: '🚑 Emergency SOS triggered. Help is on the way!', severity: 'critical' });
                playAlertBeep('critical');
            }
        } catch (error) {
            console.error('Failed to send alert response:', error);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    const statusStyles = {
        connected: { bg: '#064e3b', text: '#34d399', label: '📡 LIVE' },
        disconnected: { bg: '#7f1d1d', text: '#fca5a5', label: '⚠️ OFFLINE' },
        connecting: { bg: '#1e3a5f', text: '#93c5fd', label: '🔄 CONNECTING' },
    };
    const statusStyle = statusStyles[connectionStatus] || statusStyles.connecting;

    return (
        <div>

            {/* ── SOS Banner ──────────────────────────────────────────── */}
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

            {/* ── Feedback Modal (Are you okay?) ──────────────────────── */}
            {feedbackAlert && (
                <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 border-red-500 flex flex-col items-center text-center animate-pulse">
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-5xl mb-4">🚨</div>
                        <h2 className="text-3xl font-black text-gray-900 mb-2">ARE YOU OKAY?</h2>
                        <p className="text-red-600 font-bold mb-4">{feedbackAlert.message}</p>

                        {/* Vitals Snapshot */}
                        {feedbackAlert.vitalsSnapshot && (
                            <div className="bg-gray-100 rounded-xl p-3 mb-4 text-sm text-left w-full">
                                <p className="font-semibold text-gray-600 mb-2">Detected readings:</p>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-white rounded-lg p-2">
                                        <p className="text-xs text-gray-400">Heart Rate</p>
                                        <p className="font-bold text-red-600">{feedbackAlert.vitalsSnapshot.heartRate} bpm</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-2">
                                        <p className="text-xs text-gray-400">SpO₂</p>
                                        <p className="font-bold text-green-600">{feedbackAlert.vitalsSnapshot.spo2}%</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-2">
                                        <p className="text-xs text-gray-400">Temp</p>
                                        <p className="font-bold text-orange-500">{feedbackAlert.vitalsSnapshot.temperature}°C</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Countdown */}
                        <div className="bg-gray-100 w-full rounded-2xl p-4 mb-6">
                            <p className="text-sm text-gray-600 mb-1 font-medium">Auto-escalate in:</p>
                            <div className={`text-5xl font-black tracking-tighter ${countdown <= 5 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
                                {countdown}s
                            </div>
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

            <main className="max-w-5xl mx-auto">

                {/* ── Greeting ─────────────────────────────────────────── */}
                <div className="mb-6 flex flex-wrap justify-between items-end gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-black text-gray-900">
                                Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0]} 👋
                            </h1>
                            <span style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                                className="text-xs font-bold px-3 py-1 rounded-full">
                                {statusStyle.label}
                            </span>
                            {latencyMs !== null && (
                                <span className="text-xs text-gray-400 font-mono">{latencyMs}ms</span>
                            )}
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                            Real-time health monitoring · {lastUpdate ? `Last updated ${lastUpdate}` : 'Waiting for device data...'}
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        {[
                            { to: '/mystats', icon: '📈', label: 'Health History' },
                            { to: '/appointment', icon: '📅', label: 'Appointments' },
                            { to: '/videocall', icon: '📹', label: 'Video Call' },
                        ].map(({ to, icon, label }) => (
                            <Link key={to} to={to}
                                className="bg-white shadow-sm border border-gray-200 rounded-xl p-3 hover:shadow-md transition text-center min-w-[100px]">
                                <div className="text-2xl mb-1">{icon}</div>
                                <div className="text-xs font-bold text-gray-700">{label}</div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ── Vital Cards ──────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    <VitalCard label="Heart Rate" value={vitals.hr} icon="❤️" unit={THRESHOLDS.hr.unit} low={THRESHOLDS.hr.low} high={THRESHOLDS.hr.high} />
                    <VitalCard label="Oxygen (SpO₂)" value={vitals.spo2} icon="💨" unit={THRESHOLDS.spo2.unit} low={THRESHOLDS.spo2.low} high={THRESHOLDS.spo2.high} />
                    <VitalCard label="Temperature" value={vitals.temp} icon="🌡️" unit={THRESHOLDS.temp.unit} low={THRESHOLDS.temp.low} high={THRESHOLDS.temp.high} />
                </div>

                {/* ── Normal Ranges Legend ─────────────────────────────── */}
                <div className="mb-8 bg-white rounded-2xl shadow p-4 border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">Normal Ranges</h3>
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        {[
                            { label: 'Heart Rate', range: '50 – 100 bpm', icon: '❤️' },
                            { label: 'SpO₂', range: '92 – 100%', icon: '💨' },
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

                {/* ── Manual SOS Button ──────────────────────────────── */}
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

                {/* ── Alert History ─────────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-bold text-gray-900">🔔 Alert History</h2>
                        <span className="text-xs text-gray-400">{alerts.length} alert(s) this session</span>
                    </div>
                    {alerts.length === 0 ? (
                        <div className="p-10 text-center text-gray-400">
                            <p className="text-3xl mb-2">✅</p>
                            <p className="font-medium">All vitals normal — no alerts triggered</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {alerts.map((a, i) => (
                                <li key={i} className={`px-5 py-4 flex items-start gap-3 ${a.severity === 'critical' ? 'bg-red-50' : 'bg-orange-50'}`}>
                                    <span className="text-xl mt-0.5">{a.severity === 'critical' ? '🚨' : '⚠️'}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">{a.message}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{a.time?.toLocaleTimeString()}</p>
                                        {a.vitals && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                HR: {a.vitals.heartRate} bpm · SpO₂: {a.vitals.spo2}% · Temp: {a.vitals.temperature}°C
                                            </p>
                                        )}
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
