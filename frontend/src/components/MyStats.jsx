    import React, { useState, useEffect, useContext, useCallback } from 'react';
    import { AuthContext } from '../context/AuthContext';
    import io from 'socket.io-client';
    import { Line } from 'react-chartjs-2';
    import AlertNotification from './AlertNotification';
    import {
        Chart as ChartJS,
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        Title,
        Tooltip,
        Legend,
    } from 'chart.js';

    ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

    const MyStats = () => {
        const { user } = useContext(AuthContext);
        const [vitals, setVitals] = useState({ hr: 0, spo2: 0, temp: 0 });
        const [history, setHistory] = useState({ hr: [], spo2: [], temp: [], labels: [] });
        const [isConnected, setIsConnected] = useState(false);
        const [source, setSource] = useState('unknown');
        const [alert, setAlert] = useState(null);
        const [debugInfo, setDebugInfo] = useState('');

        const handleIncomingData = useCallback((data) => {
            console.log('📊 [DATA RECEIVED]', data);
            setSource(data.source || 'unknown');
            setDebugInfo(`Source: ${data.source || 'unknown'} | HR: ${data.hr} | Received: ${new Date().toLocaleTimeString()}`);
            
            setVitals({
                hr: data.hr ?? 0,
                spo2: data.spo2 ?? 0,
                temp: data.temp ?? 0
            });

            setHistory(prev => {
                const newLabels = [...prev.labels, new Date(data.timestamp || Date.now()).toLocaleTimeString()].slice(-40);
                return {
                    hr: [...prev.hr, data.hr].slice(-40),
                    spo2: [...prev.spo2, data.spo2].slice(-40),
                    temp: [...prev.temp, data.temp].slice(-40),
                    labels: newLabels,
                };
            });
        }, []);

        useEffect(() => {
            if (!user) {
                console.log('⚠️ No user context - waiting for login');
                return;
            }

            console.log(`🔌 Connecting to ${SOCKET_URL}`);
            const socket = io(SOCKET_URL, { 
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 10,
                forceNew: false,
                autoConnect: true
            });

            socket.on('connect', () => {
                console.log('✅ WebSocket Connected:', socket.id);
                setIsConnected(true);
                setDebugInfo(`Connected at ${new Date().toLocaleTimeString()}`);
                socket.emit('join_room', user._id);
                console.log(`📍 Joined room: ${user._id}`);
            });

            socket.on('disconnect', () => {
                console.log('❌ WebSocket Disconnected');
                setIsConnected(false);
                setDebugInfo('Disconnected - attempting reconnect...');
            });

            socket.on('connect_error', (error) => {
                console.error('🔴 Socket Connection Error:', error);
                setDebugInfo(`Error: ${error.message}`);
            });

            socket.on('global_stream_data', (data) => {
                console.log('✅ RECEIVED: global_stream_data', data);
                handleIncomingData(data);
            });

            socket.on('live_health_data', (data) => {
                console.log('✅ RECEIVED: live_health_data', data);
                handleIncomingData(data);
            });

            socket.on('feedback_request', (data) => {
                console.log('🚨 Alert received:', data);
                setAlert(data);
            });

            // Error listener
            socket.on('error', (error) => {
                console.error('🔴 Socket Error:', error);
            });

            return () => {
                console.log('🧹 Cleaning up socket connection');
                socket.disconnect();
            };
        }, [user]);

// useEffect(() => {
//     const socket = io(SOCKET_URL, { transports: ['websocket'] });

//     socket.on('connect', () => {
//         setIsConnected(true);
//         if (user) socket.emit('join_room', user._id);
//         console.log("✅ WebSocket Connected");
//     });

//     socket.on('disconnect', () => {
//         setIsConnected(false);
//     });

//     socket.on('global_stream_data', (data) => {
//         handleIncomingData(data);
//     });

//     // � Listen for abnormal health alert requests
//     socket.on('feedback_request', (data) => {
//         console.log('🚨 Alert received:', data);
//         setAlert(data);
//     });

//     // �🔥 DUMMY DATA GENERATOR (runs if no hardware data)
//     const interval = setInterval(() => {
//         const fakeData = {
//             hr: 120 + Math.random() * 10,
//             spo2: 95 + Math.random() * 3,
//             temp: 36 + Math.random() * 1,
//             timestamp: Date.now(),
//             source: "test"
//         };

//         handleIncomingData(fakeData);
//     }, 1000);

//     const handleIncomingData = (data) => {
//         setSource(data.source || 'test');

//         setVitals({
//             hr: data.hr ?? 0,
//             spo2: data.spo2 ?? 0,
//             temp: data.temp ?? 0
//         });

//         setHistory(prev => {
//             const newLabels = [...prev.labels, new Date(data.timestamp).toLocaleTimeString()].slice(-40);
//             return {
//                 hr: [...prev.hr, data.hr].slice(-40),
//                 spo2: [...prev.spo2, data.spo2].slice(-40),
//                 temp: [...prev.temp, data.temp].slice(-40),
//                 labels: newLabels,
//             };
//         });
//     };

//     return () => {
//         socket.disconnect();
//         clearInterval(interval);
//     };
// }, [user]);

        const createOptions = (min, suggestMax) => ({
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: { 
                x: { display: false }, 
                y: { 
                    ticks: { color: "#94a3b8" },
                    min: min,
                    suggestedMax: suggestMax 
                } 
            },
            plugins: { legend: { display: false } }
        });

        const getChartData = (label, dataPoints, color) => ({
            labels: history.labels,
            datasets: [{
                label,
                data: dataPoints,
                borderColor: color,
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0
            }]
        });

        return (
            <div style={styles.container}>
                {/* Alert Notification Popup */}
                <AlertNotification 
                    alert={alert}
                    onRespond={() => setAlert(null)}
                    onDismiss={() => setAlert(null)}
                />

                <header style={styles.header}>
                    <div>
                        <h1>Health History Dashboard</h1>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px', flexWrap: 'wrap' }}>
                            <span style={{ ...styles.badge, backgroundColor: isConnected ? '#064e3b' : '#7f1d1d', color: isConnected ? '#34d399' : '#fca5a5' }}>
                                {isConnected ? '📡 CONNECTED' : '⚠️ OFFLINE'}
                            </span>
                            <span style={{ 
                                ...styles.badge, 
                                backgroundColor: source === 'hardware' ? '#1e3a8a' : source === 'test' ? '#7c2d12' : '#4b5563', 
                                color: source === 'hardware' ? '#bfdbfe' : source === 'test' ? '#fed7aa' : '#cbd5e1' 
                            }}>
                                MODE: {source?.toUpperCase() || 'SEARCHING...'}
                            </span>
                            <span style={{ 
                                ...styles.badge, 
                                backgroundColor: '#1f2937',
                                color: '#9ca3af',
                                fontSize: '0.75rem'
                            }}>
                                {debugInfo || 'Initializing...'}
                            </span>
                        </div>
                    </div>
                </header>

                <div style={styles.statsGrid}>
                    <StatCard value={vitals.hr} label="Heart Rate (BPM)" color="#ef4444" />
                    <StatCard value={vitals.spo2} label="Blood Oxygen (%)" color="#22c55e" />
                    <StatCard value={vitals.temp} label="Temperature (°C)" color="#f59e0b" />
                </div>

                <div style={styles.chartsGrid}>
                    <div style={styles.chartCard}>
                        <p style={styles.chartTitle}>Heart Rate History</p>
                        <div style={styles.chartWrap}>
                            <Line options={createOptions(40, 160)} data={getChartData('HR', history.hr, '#ef4444')} />
                        </div>
                    </div>
                    <div style={styles.chartCard}>
                        <p style={styles.chartTitle}>SpO2 History</p>
                        <div style={styles.chartWrap}>
                            <Line options={createOptions(80, 100)} data={getChartData('SpO2', history.spo2, '#22c55e')} />
                        </div>
                    </div>
                    <div style={styles.chartCard}>
                        <p style={styles.chartTitle}>Temperature History</p>
                        <div style={styles.chartWrap}>
                            <Line options={createOptions(35, 40)} data={getChartData('Temp', history.temp, '#f59e0b')} />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const StatCard = ({ value, label, color }) => (
        <div style={{ ...styles.statCard, borderLeft: `5px solid ${color}` }}>
            <h2 style={styles.statValue}>{value > 0 ? value.toFixed(1) : "--"}</h2>
            <p style={styles.statLabel}>{label}</p>
        </div>
    );

    const styles = {
        container: { backgroundColor: '#020617', color: '#e5e7eb', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
        badge: { padding: '5px 15px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', transition: '0.3s' },
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
        statCard: { backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px' },
        statValue: { fontSize: '2.5rem', margin: '0 0 5px 0' },
        statLabel: { color: '#94a3b8', margin: 0 },
        chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '30px' },
        chartCard: { backgroundColor: '#0f172a', padding: '15px', borderRadius: '12px', height: '250px', display: 'flex', flexDirection: 'column' },
        chartTitle: { color: '#94a3b8', fontSize: '0.9rem', marginBottom: '10px' },
        chartWrap: { flex: 1, position: 'relative' }
    };

    export default MyStats;
