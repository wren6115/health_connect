import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import api from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const StatCard = ({ icon, label, value, sub, color, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${color} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-2xl mb-1">{icon}</p>
        <p className="text-3xl font-black text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [revenue, setRevenue] = useState({ totalRevenue: 0, platformRevenue: 0, doctorPayouts: 0, transactionCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [ovRes, trRes, aptsRes, revRes] = await Promise.allSettled([
        api.get('/analytics/admin/overview'),
        api.get('/analytics/admin/appointments?period=monthly'),
        api.get('/appointments'),
        api.get('/transactions/stats'),
      ]);
      if (ovRes.status === 'fulfilled') setOverview(ovRes.value.data.overview);
      if (trRes.status === 'fulfilled') setTrends(trRes.value.data.trends);
      if (aptsRes.status === 'fulfilled') setAppointments(aptsRes.value.data || []);
      if (revRes.status === 'fulfilled') setRevenue(revRes.value.data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const chartData = trends ? {
    labels: trends.map(t => t._id),
    datasets: [
      {
        label: 'Total',
        data: trends.map(t => t.count),
        backgroundColor: 'rgba(139,92,246,0.7)',
        borderRadius: 6,
      },
      {
        label: 'Completed',
        data: trends.map(t => t.completed),
        backgroundColor: 'rgba(16,185,129,0.6)',
        borderRadius: 6,
      }
    ]
  } : null;

  const donutData = overview ? {
    labels: ['Pending', 'Approved', 'Completed', 'Cancelled'],
    datasets: [{
      data: [
        overview.statusBreakdown?.pending || 0,
        overview.statusBreakdown?.approved || 0,
        overview.statusBreakdown?.completed || 0,
        overview.statusBreakdown?.cancelled || 0,
      ],
      backgroundColor: ['#fbbf24', '#3b82f6', '#10b981', '#ef4444'],
      borderWidth: 2,
    }]
  } : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name}; Full system visibility</p>
      </div>

      {/* Revenue Banner */}
      <div className="rounded-2xl p-6 text-white mb-6" style={{ background: 'linear-gradient(135deg,#1e3a5f 0%,#7c3aed 100%)' }}>
        <p className="text-purple-200 text-sm mb-1">Platform Revenue (Total)</p>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <p className="text-5xl font-black">${loading ? '–' : revenue.totalRevenue?.toFixed(2)}</p>
          <div className="grid grid-cols-3 gap-6 text-right">
            {[
              ['Platform Fee (10%)', `$${revenue.platformRevenue?.toFixed(2)}`],
              ['Doctor Payouts (90%)', `$${revenue.doctorPayouts?.toFixed(2)}`],
              ['Transactions', revenue.transactionCount],
            ].map(([lbl, val]) => (
              <div key={lbl}>
                <p className="text-purple-200 text-xs">{lbl}</p>
                <p className="text-xl font-black">{loading ? '–' : val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="👥" label="Total Users" value={loading ? null : overview?.totalUsers} color="border-blue-400" />
        <StatCard icon="👨‍⚕️" label="Doctors" value={loading ? null : overview?.totalDoctors} color="border-emerald-400" onClick={() => navigate('/admin/doctors')} />
        <StatCard icon="🧑‍⚕️" label="Patients" value={loading ? null : overview?.totalPatients} color="border-cyan-400" onClick={() => navigate('/admin/patients')} />
        <StatCard icon="📅" label="Appts Today" value={loading ? null : overview?.appointmentsToday} sub="This calendar day" color="border-indigo-400" onClick={() => navigate('/admin/analytics')} />
        <StatCard icon="🚨" label="Alerts (24h)" value={loading ? null : overview?.alertsLast24h} color="border-red-400" onClick={() => navigate('/admin/alerts')} />
        <StatCard icon="📱" label="Active Devices" value={loading ? null : overview?.activeDevicesCount} sub="Last 5 minutes" color="border-orange-400" />
        <StatCard icon="⏳" label="Pending Approvals" value={loading ? null : overview?.pendingUsers} color="border-yellow-400" onClick={() => navigate('/admin/settings')} />
        <StatCard icon="📊" label="Total Appts" value={loading ? null : overview?.totalAppointments} color="border-purple-400" onClick={() => navigate('/admin/analytics')} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Monthly Appointment Trends</h3>
            <button onClick={() => navigate('/admin/analytics')} className="text-purple-600 text-xs font-semibold hover:underline">Full Analytics →</button>
          </div>
          {chartData ? (
            <Bar data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} height={110} />
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">{loading ? 'Loading chart...' : 'No appointment data yet'}</div>
          )}
        </div>

        {/* Donut chart */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">Appointment Status</h3>
          {donutData ? (
            <Doughnut data={donutData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">{loading ? 'Loading...' : 'No data'}</div>
          )}
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Recent Appointments</h3>
          <button onClick={() => navigate('/admin/analytics')} className="text-purple-600 text-xs font-semibold hover:underline">View all →</button>
        </div>
        {appointments.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No appointments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Patient', 'Doctor', 'Date', 'Fee', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.slice(0, 8).map(apt => (
                  <tr key={apt._id} className="hover:bg-purple-50 cursor-pointer transition" onClick={() => navigate(`/admin/patients/${apt.patient?._id}`)}>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{apt.patient?.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">Dr. {apt.doctor?.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{new Date(apt.date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-sm text-emerald-600 font-semibold">${apt.consultationFee}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize
                        ${apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          apt.status === 'approved' ? 'bg-green-100 text-green-800' :
                            apt.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'}`}>
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
