import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import api from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function PatientHistory() {
  const { user } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get(`/analytics/patient/${user._id}`)
      .then(r => setAnalytics(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const chartData = analytics?.chartData?.labels?.length ? {
    labels: analytics.chartData.labels,
    datasets: [
      { label: 'Heart Rate (bpm)', data: analytics.chartData.hrData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', tension: 0.4, fill: true, pointRadius: 2 },
      { label: 'SpO₂ (%)', data: analytics.chartData.spo2Data, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', tension: 0.4, fill: true, pointRadius: 2 },
      { label: 'Temp (°C)', data: analytics.chartData.tempData, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', tension: 0.4, fill: true, pointRadius: 2 },
    ]
  } : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Health History</h1>
        <p className="text-gray-500 text-sm">Your vitals trends over the last 7 days</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">Loading chart data...</div>
        ) : chartData ? (
          <Line data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: false } } }} height={100} />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">No recent vitals recorded.</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: 'Total Readings (7d)', value: analytics?.totalReadings },
          { label: 'Alerts Triggered', value: analytics?.alertCount },
          { label: 'Appointments Booked', value: analytics?.appointmentCount },
        ].map(({ label, value }, idx) => (
          <div key={idx} className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-blue-400">
            <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">{label}</h3>
            <p className="text-3xl font-black text-gray-900">{value ?? '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
