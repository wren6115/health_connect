import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Line } from 'react-chartjs-2';
import AlertNotification from './AlertNotification';
// Shared singleton socket service
import socket, { joinRoom, playAlertBeep } from '../services/socketService';
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

const MyStats = () => {
    const { user } = useContext(AuthContext);
    const [vitals, setVitals] = useState({ hr: 0, spo2: 0, temp: 0 });
    const [history, setHistory] = useState({ hr: [], spo2: [], temp: [], labels: [] });
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [source, setSource] = useState('unknown');
    const [alert, setAlert] = useState(null);
    const [debugInfo, setDebugInfo] = useState('');

    const handleIncomingData = useCallback((data) => {
        console.log(`%c📊 [Data] HR:${data.hr} SpO2:${data.spo2} Temp:${data.temp}`, 'color: #34d399;');

        setSource(data.source || 'hardware');
        setVitals({
            hr: data.hr ?? 0,
            spo2: data.spo2 ?? 0,
            temp: data.temp ?? 0,
        });

        setHistory(prev => {
            const label = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return {
                hr: [...prev.hr, data.hr || 0].slice(-30),
                spo2: [...prev.spo2, data.spo2 || 0].slice(-30),
                temp: [...prev.temp, data.temp || 0].slice(-30),
                labels: [...prev.labels, label].slice(-30),
            };
        });
    }, []);

    useEffect(() => {
        if (!user) return;

        setIsConnected(socket.connected);
        joinRoom(user._id);

        const onConnect = () => {
            setIsConnected(true);
            setDebugInfo(`Connected - ${new Date().toLocaleTimeString()}`);
            joinRoom(user._id);
        };

        const onDisconnect = () => {
            setIsConnected(false);
            setDebugInfo('Disconnected - Reconnecting...');
        };

        // These events must match what your backend emits
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('vitalsUpdate', handleIncomingData); // Most common event name
        socket.on('live_health_data', handleIncomingData);
        socket.on('feedback_request', (data) => {
            playAlertBeep('critical');
            setAlert(data);
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('vitalsUpdate');
            socket.off('live_health_data');
            socket.off('feedback_request');
        };
    }, [user, handleIncomingData]);

    const chartOptions = (min, max) => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 }, // Smoother for real-time
        scales: {
            x: { display: false },
            y: { min, max, ticks: { color: '#94a3b8', stepSize: 5 } }
        },
        plugins: { legend: { display: false } }
    });

    return (
        <div style={styles.container}>
            <AlertNotification alert={alert} onRespond={() => setAlert(null)} onDismiss={() => setAlert(null)} />

            <header style={styles.header}>
                <h1>Live Health Analytics</h1>
                <div style={styles.badgeContainer}>
                    <span style={{ ...styles.badge, backgroundColor: isConnected ? '#065f46' : '#991b1b' }}>
                        {isConnected ? '● LIVE' : '○ OFFLINE'}
                    </span>
                    <span style={styles.badge}>{source.toUpperCase()}</span>
                    <small style={{ color: '#64748b' }}>{debugInfo}</small>
                </div>
            </header>

            <div style={styles.grid}>
                {/* Heart Rate Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h3>Heart Rate</h3>
                        <span style={{ ...styles.value, color: '#ef4444' }}>{vitals.hr} <small>BPM</small></span>
                    </div>
                    <div style={styles.chartWrapper}>
                        <Line data={{
                            labels: history.labels,
                            datasets: [{ data: history.hr, borderColor: '#ef4444', borderWidth: 2, tension: 0.4, pointRadius: 0 }]
                        }} options={chartOptions(40, 160)} />
                    </div>
                </div>

                {/* SpO2 Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h3>Oxygen Saturation</h3>
                        <span style={{ ...styles.value, color: '#3b82f6' }}>{vitals.spo2} <small>%</small></span>
                    </div>
                    <div style={styles.chartWrapper}>
                        <Line data={{
                            labels: history.labels,
                            datasets: [{ data: history.spo2, borderColor: '#3b82f6', borderWidth: 2, tension: 0.4, pointRadius: 0 }]
                        }} options={chartOptions(80, 100)} />
                    </div>
                </div>

                {/* Temperature Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h3>Body Temp</h3>
                        <span style={{ ...styles.value, color: '#10b981' }}>{vitals.temp.toFixed(1)} <small>°C</small></span>
                    </div>
                    <div style={styles.chartWrapper}>
                        <Line data={{
                            labels: history.labels,
                            datasets: [{ data: history.temp, borderColor: '#10b981', borderWidth: 2, tension: 0.4, pointRadius: 0 }]
                        }} options={chartOptions(30, 45)} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px', backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' },
    header: { marginBottom: '30px' },
    badgeContainer: { display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' },
    badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#1e293b' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' },
    card: { backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
    value: { fontSize: '1.8rem', fontWeight: 'bold' },
    chartWrapper: { height: '150px' }
};

export default MyStats;
