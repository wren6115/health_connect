import React, { useState, useEffect } from 'react';

const AlertNotification = ({ alert, onRespond, onDismiss }) => {
    const [timeLeft, setTimeLeft] = useState(15);
    const [responded, setResponded] = useState(false);

    useEffect(() => {
        if (!alert || responded) return;

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [alert, responded]);

    if (!alert) return null;

    const handleResponse = async (isOkay) => {
        setResponded(true);
        try {
            const response = await fetch('http://localhost:5000/api/device/alert-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alertId: alert.alertId,
                    isOkay: isOkay
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Alert response sent:', result);
                onRespond();
            } else {
                console.error('Failed to send alert response');
            }
        } catch (error) {
            console.error('Error sending alert response:', error);
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical':
                return '#dc2626'; // red
            case 'warning':
                return '#f59e0b'; // orange
            default:
                return '#06b6d4'; // cyan
        }
    };

    const getSeverityBg = (severity) => {
        switch (severity) {
            case 'critical':
                return '#7f1d1d'; // dark red
            case 'warning':
                return '#7c2d12'; // dark orange
            default:
                return '#164e63'; // dark cyan
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            animation: 'slideIn 0.3s ease-in'
        }}>
            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes pulse {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
                    }
                    50% {
                        box-shadow: 0 0 0 10px rgba(220, 38, 38, 0);
                    }
                }
            `}</style>

            <div style={{
                backgroundColor: getSeverityBg(alert.severity),
                borderLeft: `5px solid ${getSeverityColor(alert.severity)}`,
                borderRadius: '12px',
                padding: '20px',
                maxWidth: '400px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                color: '#e5e7eb',
                fontFamily: 'sans-serif',
                animation: alert.severity === 'critical' ? 'pulse 2s infinite' : 'none'
            }}>
                {/* Header with Icon */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ marginRight: '10px', fontSize: '1.5rem' }}>⚠️</span>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: getSeverityColor(alert.severity) }}>
                        {alert.severity.toUpperCase()} ALERT
                    </h3>
                </div>

                {/* Alert Message */}
                <p style={{ 
                    margin: '12px 0', 
                    fontSize: '0.95rem',
                    lineHeight: '1.5',
                    color: '#f3f4f6'
                }}>
                    {alert.message}
                </p>

                {/* Vitals Snapshot */}
                {alert.vitalsSnapshot && (
                    <div style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        padding: '10px',
                        marginBottom: '15px',
                        fontSize: '0.85rem'
                    }}>
                        <p style={{ margin: '5px 0', color: '#d1d5db' }}>
                            <strong>Heart Rate:</strong> {alert.vitalsSnapshot.heartRate ?? '--'} BPM
                        </p>
                        <p style={{ margin: '5px 0', color: '#d1d5db' }}>
                            <strong>SpO2:</strong> {alert.vitalsSnapshot.spo2 ?? '--'}%
                        </p>
                        <p style={{ margin: '5px 0', color: '#d1d5db' }}>
                            <strong>Temperature:</strong> {alert.vitalsSnapshot.temperature ?? '--'}°C
                        </p>
                    </div>
                )}

                {/* Countdown Timer */}
                <div style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '6px',
                    padding: '8px',
                    marginBottom: '15px',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    color: timeLeft <= 5 ? '#fca5a5' : '#d1d5db'
                }}>
                    ⏱️ Auto-escalate in <strong>{timeLeft}s</strong> if no response
                </div>

                {/* Action Buttons */}
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '15px'
                }}>
                    <button
                        onClick={() => handleResponse(true)}
                        disabled={responded}
                        style={{
                            flex: 1,
                            padding: '10px 15px',
                            backgroundColor: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            cursor: responded ? 'not-allowed' : 'pointer',
                            opacity: responded ? 0.6 : 1,
                            transition: 'all 0.3s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        ✅ I'm OK
                    </button>
                    <button
                        onClick={() => handleResponse(false)}
                        disabled={responded}
                        style={{
                            flex: 1,
                            padding: '10px 15px',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            cursor: responded ? 'not-allowed' : 'pointer',
                            opacity: responded ? 0.6 : 1,
                            transition: 'all 0.3s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        🚨 Get Help!
                    </button>
                </div>

                {/* Response Status */}
                {responded && (
                    <div style={{
                        marginTop: '12px',
                        padding: '10px',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '6px',
                        textAlign: 'center',
                        fontSize: '0.85rem',
                        color: '#86efac'
                    }}>
                        ✅ Response received. Please wait...
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlertNotification;
