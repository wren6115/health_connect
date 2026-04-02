import React, { useEffect, useState } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import api from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function AdminAnalytics() {
  const [period, setPeriod] = useState('monthly');
  const [trends, setTrends] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.get(`/analytics/admin/appointments?period=${period}`),
      api.get('/analytics/admin/doctors'),
    ]).then(([trRes, docRes]) => {
      if (trRes.status === 'fulfilled') setTrends(trRes.value.data.trends || []);
      if (docRes.status === 'fulfilled') setDoctors(docRes.value.data.doctors || []);
      setLoading(false);
    });
  }, [period]);

  const trendChart = {
    labels: trends.map(t => t._id),
    datasets: [
      { label: 'Total Appointments', data: trends.map(t => t.count), backgroundColor: 'rgba(139,92,246,0.75)', borderRadius: 6 },
      { label: 'Completed', data: trends.map(t => t.completed), backgroundColor: 'rgba(16,185,129,0.65)', borderRadius: 6 },
      { label: 'Pending', data: trends.map(t => t.pending), backgroundColor: 'rgba(251,191,36,0.65)', borderRadius: 6 },
    ]
  };

  const doctorChart = {
    labels: doctors.slice(0, 8).map(d => `Dr. ${d.name}`),
    datasets: [
      { label: 'This Month', data: doctors.slice(0, 8).map(d => d.appointmentsThisMonth), backgroundColor: 'rgba(59,130,246,0.75)', borderRadius: 6 },
      { label: 'Total Patients', data: doctors.slice(0, 8).map(d => d.patientCount), backgroundColor: 'rgba(245,158,11,0.65)', borderRadius: 6 },
    ]
  };

  const pieChart = {
    labels: ['Pending', 'Approved', 'Completed', 'Cancelled'],
    datasets: [{
      data: [
        trends.reduce((s, t) => s + (t.pending || 0), 0),
        trends.reduce((s, t) => s + ((t.count - t.completed - t.pending) || 0), 0),
        trends.reduce((s, t) => s + (t.completed || 0), 0),
        0
      ],
      backgroundColor: ['#fbbf24', '#3b82f6', '#10b981', '#ef4444'],
      borderWidth: 2,
    }]
  };

  const chartOpts = { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm">Platform-wide analytics and doctor performance insights</p>
        </div>
        <div className="flex gap-2">
          {['weekly', 'monthly', 'yearly'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition capitalize
                ${period === p ? 'bg-purple-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Loading analytics...</div>
      ) : (
        <div className="space-y-6">
          {/* Appointment trend bar chart */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">📅 Appointment Trends ({period})</h3>
            {trends.length > 0 ? (
              <Bar data={trendChart} options={chartOpts} height={90} />
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No data for selected period.</div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Doctor comparison */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">👨‍⚕️ Doctor Performance Comparison</h3>
              {doctors.length > 0 ? (
                <Bar data={doctorChart} options={{ ...chartOpts, indexAxis: 'y', scales: { x: { beginAtZero: true } } }} height={doctors.slice(0, 8).length * 28 + 40} />
              ) : (
                <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No doctors found.</div>
              )}
            </div>

            {/* Appointment status pie */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">📊 Appointment Status Breakdown</h3>
              <Pie data={pieChart} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </div>

          {/* Doctor leaderboard */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">🏆 Doctor Leaderboard (by appointment volume)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>{['Rank', 'Doctor', 'Specialty', 'Total Appointments', 'This Month', 'Patients', 'Rating'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...doctors].sort((a, b) => b.totalAppointments - a.totalAppointments).map((doc, i) => (
                    <tr key={doc._id} className="hover:bg-purple-50">
                      <td className="px-4 py-3 text-sm font-black text-gray-400">#{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                            {doc.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">Dr. {doc.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{doc.specialization}</td>
                      <td className="px-4 py-3 text-sm font-black text-purple-700">{doc.totalAppointments}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-blue-600">{doc.appointmentsThisMonth}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{doc.patientCount}</td>
                      <td className="px-4 py-3 text-sm text-yellow-600 font-semibold">{doc.rating?.toFixed(1) || '—'} ⭐</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
