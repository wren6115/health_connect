import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import socket from '../../services/socketService';

const sev = { critical: 'border-red-500 bg-red-50', warning: 'border-orange-400 bg-orange-50', info: 'border-blue-400 bg-blue-50' };
const sevBadge = { critical: 'bg-red-200 text-red-800', warning: 'bg-orange-200 text-orange-800', info: 'bg-blue-200 text-blue-800' };

export default function DoctorAlerts() {
  const { user } = useContext(AuthContext);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    socket.emit('join_room', 'admin_and_doctors');
    const onAlert = (p) => setAlerts(prev => [{ ...p, type: 'Escalation', time: new Date() }, ...prev]);
    const onSOS = (p) => setAlerts(prev => [{ type: 'Manual SOS', severity: 'critical', message: `🚨 SOS from ${p.patientName}`, time: new Date() }, ...prev]);
    
    socket.on('escalated_alert', onAlert);
    socket.on('sos_triggered', onSOS);

    return () => {
      socket.off('escalated_alert', onAlert);
      socket.off('sos_triggered', onSOS);
    };
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Patient Alerts</h1>
        <p className="text-gray-500 text-sm">Real-time alerts for your assigned patients via IoT monitoring</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900">Live Alert Feed</h3>
            <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full animate-pulse">Monitoring</span>
          </div>
          <button onClick={() => setAlerts([])} className="text-xs text-gray-500 font-semibold hover:text-gray-900 transition">
            Clear all
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-4">🩺</p>
              <p className="font-medium text-lg">No active alerts</p>
              <p className="text-sm mt-1">Listening for real-time patient data...</p>
            </div>
          ) : (
            alerts.map((a, i) => (
              <div key={i} className={`rounded-xl shadow-sm p-4 border-l-4 ${sev[a.severity] || sev.info} flex items-start justify-between gap-4 animate-in slide-in-from-top-2`}>
                <div className="flex items-start gap-4">
                  <div className="text-3xl mt-1">{a.severity === 'critical' ? '🚨' : '⚠️'}</div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg mb-0.5">{a.message}</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-semibold text-gray-800">Patient: {a.patientName || 'Unknown'}</span>
                    </p>
                    {a.vitalsSnapshot && (
                      <div className="flex gap-4 text-xs font-semibold">
                        <span className="bg-white px-2 py-1 rounded text-red-600 shadow-sm border border-red-100">HR: {a.vitalsSnapshot.heartRate} bpm</span>
                        <span className="bg-white px-2 py-1 rounded text-blue-600 shadow-sm border border-blue-100">SpO₂: {a.vitalsSnapshot.spo2}%</span>
                        <span className="bg-white px-2 py-1 rounded text-orange-600 shadow-sm border border-orange-100">Temp: {a.vitalsSnapshot.temperature}°C</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${sevBadge[a.severity] || sevBadge.info}`}>
                    {a.type || a.severity}
                  </span>
                  <p className="text-xs text-gray-400 mt-2 font-mono">
                    {new Date(a.time).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
