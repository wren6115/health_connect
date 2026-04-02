import React, { useEffect, useState } from 'react';
import socket from '../../services/socketService';
import api from '../../services/api';

const sev = { critical: 'border-red-500 bg-red-50', warning: 'border-orange-400 bg-orange-50', info: 'border-blue-400 bg-blue-50' };
const sevBadge = { critical: 'bg-red-200 text-red-800', warning: 'bg-orange-200 text-orange-800', info: 'bg-blue-200 text-blue-800' };

export default function AdminAlerts() {
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    socket.emit('join_room', 'admin_and_doctors');
    const onEscalation = (payload) => setLiveAlerts(p => [{ ...payload, type: 'Escalation', time: new Date() }, ...p.slice(0, 29)]);
    const onSOS = (payload) => setLiveAlerts(p => [{ type: 'Manual SOS', severity: 'critical', message: `🚨 SOS from ${payload.patientName}`, time: new Date() }, ...p.slice(0, 29)]);
    socket.on('escalated_alert', onEscalation);
    socket.on('sos_triggered', onSOS);

    api.get('/symptoms').then(r => setSymptoms(r.data || [])).catch(() => {}).finally(() => setLoading(false));

    return () => { socket.off('escalated_alert', onEscalation); socket.off('sos_triggered', onSOS); };
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Alerts</h1>
        <p className="text-gray-500 text-sm">Real-time patient alerts and historical symptom reports</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Live Alerts */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="font-bold text-gray-900">🔴 Live Alerts</span>
            <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full animate-pulse">Real-time</span>
            {liveAlerts.length > 0 && <span className="text-xs bg-gray-200 text-gray-700 font-semibold px-2 py-0.5 rounded-full">{liveAlerts.length}</span>}
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {liveAlerts.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center text-gray-400">
                <p className="text-4xl mb-2">✅</p>
                <p className="font-medium">No live alerts — all patients stable</p>
              </div>
            ) : liveAlerts.map((a, i) => (
              <div key={i} className={`bg-white rounded-2xl shadow-sm p-4 border-l-4 ${sev[a.severity] || sev.info}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{a.severity === 'critical' ? '🚨' : '⚠️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.patientName && `Patient: ${a.patientName} · `}{new Date(a.time).toLocaleTimeString()}
                    </p>
                    {a.vitalsSnapshot && (
                      <p className="text-xs text-gray-500 mt-1">
                        HR: {a.vitalsSnapshot.heartRate} · SpO₂: {a.vitalsSnapshot.spo2}% · Temp: {a.vitalsSnapshot.temperature}°C
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${sevBadge[a.severity] || sevBadge.info}`}>
                    {a.type || a.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historical Symptoms */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="font-bold text-gray-900">📋 Symptom Reports</span>
            {!loading && <span className="text-xs bg-gray-200 text-gray-700 font-semibold px-2 py-0.5 rounded-full">{symptoms.length}</span>}
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="bg-white rounded-2xl p-10 text-center text-gray-400">Loading...</div>
            ) : symptoms.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center text-gray-400">No symptom reports yet.</div>
            ) : symptoms.map(s => (
              <div key={s._id} className={`bg-white rounded-2xl shadow-sm p-4 border-l-4 ${s.severity === 'high' ? 'border-red-500' : s.severity === 'medium' ? 'border-yellow-400' : 'border-blue-400'}`}>
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${s.severity === 'high' ? 'bg-red-100 text-red-700' : s.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{s.severity}</span>
                      <span className="font-semibold text-gray-900 text-sm">{s.patient?.name}</span>
                      <span className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 italic">"{s.message}"</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${s.status === 'new' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
