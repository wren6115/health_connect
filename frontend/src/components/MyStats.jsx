import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import io from 'socket.io-client';
import { Line } from 'react-chartjs-2';
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

const SOCKET_URL = 'http://localhost:5000';

const MyStats = () => {
    const { user } = useContext(AuthContext);
    const [vitals, setVitals] = useState({ hr: 0, spo2: 0, temp: 0 });
    const [history, setHistory] = useState({ hr: [], spo2: [], temp: [], labels: [] });
    const [isConnected, setIsConnected] = useState(false);
    const [source, setSource] = useState('unknown');

    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ['websocket'] });

        socket.on('connect', () => {
            setIsConnected(true);
            if (user) socket.emit('join_room', user._id);
            console.log("✅ WebSocket Connected: Real-time monitoring active.");
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('global_stream_data', (data) => {
            setSource(data.source || 'hardware');
            
            // VERIFICATION LOG: Match this with your serialBridge.js output!
            console.log(`[${data.source?.toUpperCase() || 'DATA'}] HR:${data.hr} | SpO2:${data.spo2}% | Temp:${data.temp}°C`);
            
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
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

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
            <header style={styles.header}>
                <div>
                    <h1>Health History Dashboard</h1>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                        <span style={{ ...styles.badge, backgroundColor: isConnected ? '#064e3b' : '#7f1d1d', color: isConnected ? '#34d399' : '#fca5a5' }}>
                            {isConnected ? '📡 CONNECTED' : '⚠️ OFFLINE'}
                        </span>
                        <span style={{ 
                            ...styles.badge, 
                            backgroundColor: source === 'hardware' ? '#1e3a8a' : '#7c2d12', 
                            color: source === 'hardware' ? '#bfdbfe' : '#fed7aa' 
                        }}>
                             MODE: {source?.toUpperCase() || 'SEARCHING...'}
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
