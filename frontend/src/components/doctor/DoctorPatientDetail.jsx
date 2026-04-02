import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import socket from '../../services/socketService';
import api from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function DoctorPatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [liveVitals, setLiveVitals] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Join patient room for live vitals
    socket.emit('join_room', id);
    const onVitals = (data) => setLiveVitals(data);
    socket.on('vitalsUpdate', onVitals);
    socket.on('global_stream_data', onVitals);

    Promise.allSettled([
      api.get(`/users/${id}/full`),
      api.get(`/analytics/patient/${id}`),
      api.get(`/appointments/by-patient/${id}`),
    ]).then(([uRes, aRes, apRes]) => {
      if (uRes.status === 'fulfilled') setUserInfo(uRes.value.data);
      if (aRes.status === 'fulfilled') setAnalytics(aRes.value.data);
      if (apRes.status === 'fulfilled') setAppointments(apRes.value.data.appointments || []);
      setLoading(false);
    });

    return () => { socket.off('vitalsUpdate', onVitals); socket.off('global_stream_data', onVitals); };
  }, [id]);

  const chartData = analytics?.chartData?.labels?.length ? {
    labels: analytics.chartData.labels,
    datasets: [
      { label: 'HR (bpm)', data: analytics.chartData.hrData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', tension: 0.4, fill: true, pointRadius: 2 },
      { label: 'SpO₂ (%)', data: analytics.chartData.spo2Data, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', tension: 0.4, fill: true, pointRadius: 2 },
      { label: 'Temp (°C)', data: analytics.chartData.tempData, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', tension: 0.4, fill: true, pointRadius: 2 },
    ]
  } : null;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading patient data...</div>;
  if (!userInfo?.user) return <div className="text-center py-12 text-gray-400">Patient not found.</div>;

  const { user, profile } = userInfo;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/doctor/patients')} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition">← Back</button>
        <div>
          <h1 className="text-2xl font-black text-gray-900">{user.name}</h1>
          <p className="text-sm text-gray-400">{user.email} · {profile?.age} yrs · {profile?.gender}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="space-y-5">
          {/* Live Vitals */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-bold text-gray-900">Live Vitals</h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${liveVitals ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                {liveVitals ? '📡 LIVE' : 'No Signal'}
              </span>
            </div>
            {liveVitals ? (
              <div className="space-y-3">
                {[
                  { label: 'Heart Rate', value: `${liveVitals.hr} bpm`, icon: '❤️', warn: liveVitals.hr < 50 || liveVitals.hr > 100 },
                  { label: 'SpO₂', value: `${liveVitals.spo2}%`, icon: '💨', warn: liveVitals.spo2 < 92 },
                  { label: 'Temperature', value: `${liveVitals.temp}°C`, icon: '🌡️', warn: liveVitals.temp < 35 || liveVitals.temp > 38 },
                ].map(({ label, value, icon, warn }) => (
                  <div key={label} className={`flex items-center justify-between p-3 rounded-xl ${warn ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <span className="text-sm text-gray-500">{icon} {label}</span>
                    <span className={`font-black text-base ${warn ? 'text-red-600' : 'text-gray-900'}`}>{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">Waiting for device data...</p>
            )}
          </div>

          {/* Health summary */}
          {analytics && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-3">Health Summary (7d)</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                {[
                  { label: 'Readings', value: analytics.totalReadings },
                  { label: 'Alerts', value: analytics.alertCount },
                  { label: 'Risk Score', value: `${analytics.riskScore}%` },
                  { label: 'Risk Level', value: analytics.riskLevel },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className={`text-xl font-black capitalize ${label === 'Risk Level' ? (analytics.riskLevel === 'high' ? 'text-red-600' : analytics.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600') : 'text-gray-900'}`}>{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: charts + appointments */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Vitals Trend (Last 7 Days)</h3>
            {chartData ? (
              <Line data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: false } } }} height={90} />
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No vitals data in last 7 days.</div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Appointment History ({appointments.length})</h3>
            </div>
            {appointments.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No appointments with this patient.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>{['Date', 'Reason', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {appointments.map(a => (
                      <tr key={a._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{new Date(a.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-[180px] truncate">{a.reason}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${a.status === 'completed' ? 'bg-blue-100 text-blue-800' : a.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{a.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {a.status === 'approved' && (
                            <button onClick={async () => { await api.put(`/appointments/${a._id}/status`, { status: 'completed' }); setAppointments(prev => prev.map(x => x._id === a._id ? { ...x, status: 'completed' } : x)); }}
                              className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg font-semibold hover:bg-blue-100 transition">
                              Mark Done
                            </button>
                          )}
                          {a.status === 'pending' && (
                            <button onClick={async () => { await api.put(`/appointments/${a._id}/status`, { status: 'approved' }); setAppointments(prev => prev.map(x => x._id === a._id ? { ...x, status: 'approved' } : x)); }}
                              className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-lg font-semibold hover:bg-green-100 transition">
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
