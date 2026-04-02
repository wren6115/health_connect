import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import socket from '../services/socketService';
import api from '../services/api';
import Chatbot from './Chatbot';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function DoctorDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    socket.emit('join_room', 'admin_and_doctors');
    const onAlert = (p) => setAlerts(prev => [{ ...p, type: 'Escalation', time: new Date() }, ...prev.slice(0, 19)]);
    const onSOS = (p) => setAlerts(prev => [{ type: 'SOS', severity: 'critical', message: `🚨 SOS from ${p.patientName}`, time: new Date() }, ...prev.slice(0, 19)]);
    socket.on('escalated_alert', onAlert);
    socket.on('sos_triggered', onSOS);

    Promise.allSettled([
      api.get(`/analytics/doctor/${user._id}?period=monthly`),
      api.get('/appointments'),
    ]).then(([anRes, apRes]) => {
      if (anRes.status === 'fulfilled') setAnalytics(anRes.value.data);
      if (apRes.status === 'fulfilled') setAppointments(apRes.value.data || []);
      setLoading(false);
    });

    return () => { socket.off('escalated_alert', onAlert); socket.off('sos_triggered', onSOS); };
  }, [user]);

  const chartData = analytics?.monthlyBuckets ? {
    labels: analytics.monthlyBuckets.map(b => b.month),
    datasets: [{
      label: 'Appointments',
      data: analytics.monthlyBuckets.map(b => b.count),
      backgroundColor: 'rgba(16,185,129,0.75)',
      borderRadius: 8,
    }]
  } : null;

  const thisWeekCount = analytics?.weeklyBuckets?.slice(-1)[0]?.count ?? 0;
  const thisMonthCount = analytics?.monthlyBuckets?.slice(-1)[0]?.count ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Doctor Dashboard</h1>
        <p className="text-gray-500 text-sm">Welcome, Dr. {user?.name}; analytical overview of your practice</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: '📅', label: 'This Week', value: loading ? null : thisWeekCount, color: 'border-emerald-400', onClick: () => navigate('/doctor/appointments') },
          { icon: '📊', label: 'This Month', value: loading ? null : thisMonthCount, color: 'border-teal-400', onClick: () => navigate('/doctor/appointments') },
          { icon: '🧑‍⚕️', label: 'My Patients', value: loading ? null : analytics?.patientLoad, color: 'border-blue-400', onClick: () => navigate('/doctor/patients') },
          { icon: '🚨', label: 'Live Alerts', value: alerts.length, color: alerts.length > 0 ? 'border-red-400' : 'border-gray-200', onClick: () => navigate('/doctor/alerts') },
        ].map(({ icon, label, value, color, onClick }) => (
          <div key={label} onClick={onClick} className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${color} cursor-pointer hover:shadow-md transition`}>
            <span className="text-2xl block mb-1">{icon}</span>
            <p className="text-3xl font-black text-gray-900">{value ?? '—'}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Monthly Appointment Trend</h3>
            <button onClick={() => navigate('/doctor/appointments')} className="text-emerald-600 text-xs font-semibold hover:underline">View all →</button>
          </div>
          {chartData ? (
            <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} height={110} />
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">{loading ? 'Loading...' : 'No data yet'}</div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Live Patient Alerts</h3>
            <span className="text-xs text-gray-400">Real-time</span>
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-400"><p className="text-3xl mb-2">✅</p><p className="text-sm">No active alerts</p></div>
          ) : alerts.slice(0, 5).map((a, i) => (
            <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-xl">{a.severity === 'critical' ? '🚨' : '⚠️'}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{a.message}</p>
                <p className="text-xs text-gray-400">{a.patientName} · {new Date(a.time).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
          {alerts.length > 0 && (
            <button onClick={() => navigate('/doctor/alerts')} className="mt-3 text-xs text-red-600 font-semibold hover:underline w-full text-center">
              View all alerts →
            </button>
          )}
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Recent Appointments</h3>
          <button onClick={() => navigate('/doctor/appointments')} className="text-emerald-600 text-xs font-semibold hover:underline">View all →</button>
        </div>
        {appointments.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No appointments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>{['Patient', 'Date', 'Reason', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.slice(0, 6).map(apt => (
                  <tr key={apt._id} className="hover:bg-emerald-50 transition cursor-pointer" onClick={() => navigate(`/doctor/patients/${apt.patient?._id}`)}>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{apt.patient?.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{new Date(apt.date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 max-w-[160px] truncate">{apt.reason}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : apt.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{apt.status}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-emerald-600 font-semibold">View →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Chatbot />
    </div>
  );
}
