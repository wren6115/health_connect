import React, { useState, useEffect, useRef } from 'react';

/**
 * AlertNotification
 * ─────────────────────────────────────────────────────────────────────────
 * Shown when the backend emits a `feedback_request` event.
 *
 * FIX 3: The old code used `alert` (an object) as a useEffect dependency.
 * Every time the parent re-rendered and passed a new object reference,
 * the countdown reset to 15 — causing the frontend timer to desync from
 * the backend's 15-second escalation timer.
 *
 * The fix: store the alert's stable `alertId` string in a ref and only
 * reset the countdown when that ID actually changes.
 */
const AlertNotification = ({ alert, onRespond, onDismiss }) => {
    const [timeLeft, setTimeLeft]   = useState(15);
    const [responded, setResponded] = useState(false);

    // Track the last alertId to detect genuine new alerts (not just re-renders)
    const lastAlertIdRef = useRef(null);

    useEffect(() => {
        if (!alert) return;

        const incoming = alert.alertId?.toString();

        // Only reset the countdown if this is a genuinely NEW alert
        if (incoming !== lastAlertIdRef.current) {
            lastAlertIdRef.current = incoming;
            setTimeLeft(15);
            setResponded(false);
        }
    }, [alert]);

    useEffect(() => {
        if (!alert || responded || timeLeft <= 0) return;

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
    // Use timeLeft > 0 check inside the effect — only re-register when alert or responded changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alert?.alertId, responded]);

    if (!alert) return null;

    const handleResponse = async (isOkay) => {
        setResponded(true);
        try {
            const response = await fetch('http://localhost:5000/api/device/alert-response', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    alertId: alert.alertId,
                    isOkay,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('[AlertNotification] Response sent:', result);
                onRespond();
            } else {
                console.error('[AlertNotification] Failed to send response — status:', response.status);
            }
        } catch (error) {
            console.error('[AlertNotification] Network error sending response:', error);
        }
    };

    const severityColor = {
        critical: '#dc2626',
        warning:  '#f59e0b',
        info:     '#06b6d4',
    }[alert.severity] ?? '#06b6d4';

    const severityBg = {
        critical: '#7f1d1d',
        warning:  '#7c2d12',
        info:     '#164e63',
    }[alert.severity] ?? '#164e63';

    return (
        <div style={{
            position:  'fixed',
            top:       '20px',
            right:     '20px',
            zIndex:    9999,
            animation: 'slideIn 0.3s ease-out',
        }}>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(420px); opacity: 0; }
                    to   { transform: translateX(0);     opacity: 1; }
                }
                @keyframes pulseBorder {
                    0%, 100% { box-shadow: 0 0 0 0   rgba(220, 38, 38, 0.7); }
                    50%      { box-shadow: 0 0 0 12px rgba(220, 38, 38, 0);   }
                }
            `}</style>

            <div style={{
                backgroundColor: severityBg,
                borderLeft:      `5px solid ${severityColor}`,
                borderRadius:    '12px',
                padding:         '20px',
                maxWidth:        '400px',
                width:           '90vw',
                boxShadow:       '0 10px 40px rgba(0, 0, 0, 0.4)',
                color:           '#e5e7eb',
                fontFamily:      'sans-serif',
                animation:       alert.severity === 'critical' ? 'pulseBorder 1.5s infinite' : 'none',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ marginRight: '10px', fontSize: '1.5rem' }}>⚠️</span>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: severityColor }}>
                        {alert.severity?.toUpperCase()} ALERT
                    </h3>
                    <button
                        onClick={onDismiss}
                        style={{
                            marginLeft:      'auto',
                            background:      'transparent',
                            border:          'none',
                            color:           '#9ca3af',
                            cursor:          'pointer',
                            fontSize:        '1.1rem',
                            lineHeight:      1,
                        }}
                        title="Dismiss"
                    >
                        ✕
                    </button>
                </div>

                {/* Message */}
                <p style={{ margin: '12px 0', fontSize: '0.95rem', lineHeight: '1.5', color: '#f3f4f6' }}>
                    {alert.message}
                </p>

                {/* Vitals Snapshot */}
                {alert.vitalsSnapshot && (
                    <div style={{
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        borderRadius:    '8px',
                        padding:         '10px',
                        marginBottom:    '12px',
                        fontSize:        '0.85rem',
                    }}>
                        <p style={{ margin: '4px 0', color: '#d1d5db' }}>
                            <strong>Heart Rate:</strong> {alert.vitalsSnapshot.heartRate ?? '--'} BPM
                        </p>
                        <p style={{ margin: '4px 0', color: '#d1d5db' }}>
                            <strong>SpO₂:</strong> {alert.vitalsSnapshot.spo2 ?? '--'}%
                        </p>
                        <p style={{ margin: '4px 0', color: '#d1d5db' }}>
                            <strong>Temperature:</strong> {alert.vitalsSnapshot.temperature ?? '--'}°C
                        </p>
                    </div>
                )}

                {/* Countdown */}
                <div style={{
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius:    '6px',
                    padding:         '8px',
                    marginBottom:    '15px',
                    textAlign:       'center',
                    fontSize:        '0.85rem',
                    color:           timeLeft <= 5 ? '#fca5a5' : '#d1d5db',
                    fontWeight:      timeLeft <= 5 ? 'bold' : 'normal',
                }}>
                    ⏱️ Auto-escalate in <strong>{timeLeft}s</strong> if no response
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        id="alert-okay-btn"
                        onClick={() => handleResponse(true)}
                        disabled={responded}
                        style={{
                            flex:            1,
                            padding:         '10px 15px',
                            backgroundColor: responded ? '#4b7c63' : '#10b981',
                            color:           '#fff',
                            border:          'none',
                            borderRadius:    '6px',
                            fontSize:        '0.9rem',
                            fontWeight:      'bold',
                            cursor:          responded ? 'not-allowed' : 'pointer',
                            opacity:         responded ? 0.7 : 1,
                            transition:      'all 0.2s',
                        }}
                    >
                        ✅ I'm OK
                    </button>
                    <button
                        id="alert-help-btn"
                        onClick={() => handleResponse(false)}
                        disabled={responded}
                        style={{
                            flex:            1,
                            padding:         '10px 15px',
                            backgroundColor: responded ? '#7f1d1d' : '#ef4444',
                            color:           '#fff',
                            border:          'none',
                            borderRadius:    '6px',
                            fontSize:        '0.9rem',
                            fontWeight:      'bold',
                            cursor:          responded ? 'not-allowed' : 'pointer',
                            opacity:         responded ? 0.7 : 1,
                            transition:      'all 0.2s',
                        }}
                    >
                        🚨 Get Help!
                    </button>
                </div>

                {/* Response status */}
                {responded && (
                    <div style={{
                        marginTop:       '12px',
                        padding:         '10px',
                        backgroundColor: 'rgba(16,185,129,0.1)',
                        borderRadius:    '6px',
                        textAlign:       'center',
                        fontSize:        '0.85rem',
                        color:           '#86efac',
                    }}>
                        ✅ Response received. Please wait...
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlertNotification;
