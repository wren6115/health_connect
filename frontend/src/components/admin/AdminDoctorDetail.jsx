import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function AdminDoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctorData, setDoctorData] = useState({ user: null, profile: null });
  const [analytics, setAnalytics] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [userRes, analyticsRes, aptsRes] = await Promise.allSettled([
        api.get(`/users/${id}/full`),
        api.get(`/analytics/doctor/${id}?period=${period}`),
        api.get(`/appointments/by-doctor/${id}`),
      ]);
      if (userRes.status === 'fulfilled') setDoctorData(userRes.value.data);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
      if (aptsRes.status === 'fulfilled') setAppointments(aptsRes.value.data.appointments || []);
      setLoading(false);
    };
    fetchAll();
  }, [id, period]);

  const chartData = analytics?.monthlyBuckets ? {
    labels: analytics.monthlyBuckets.map(b => b.month),
    datasets: [{
      label: 'Appointments',
      data: analytics.monthlyBuckets.map(b => b.count),
      backgroundColor: 'rgba(16,185,129,0.7)',
      borderRadius: 8,
    }]
  } : null;

  const weeklyChartData = analytics?.weeklyBuckets ? {
    labels: analytics.weeklyBuckets.map(b => b.week),
    datasets: [{
      label: 'Appointments',
      data: analytics.weeklyBuckets.map(b => b.count),
      backgroundColor: 'rgba(139,92,246,0.7)',
      borderRadius: 8,
    }]
  } : null;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading doctor data...</div>;
  if (!doctorData.user) return <div className="text-center py-12 text-gray-400">Doctor not found.</div>;

  const { user, profile } = doctorData;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/doctors')} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">← Back</button>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dr. {user.name}</h1>
          <p className="text-sm text-gray-400">{user.email} · {profile?.specialization}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: profile */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-3xl font-black">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-black text-gray-900 text-lg">Dr. {user.name}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
                <span className={`text-xs font-semibold mt-1 inline-block px-2 py-0.5 rounded-full ${user.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {user.status}
                </span>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['Specialization', profile?.specialization],
                ['Experience', profile?.experience ? `${profile.experience} years` : null],
                ['Consultation Fee', profile?.consultationFee ? `$${profile.consultationFee}` : null],
                ['Rating', profile?.rating ? `${profile.rating} / 5 ⭐` : null],
                ['Languages', profile?.languages?.join(', ')],
              ].filter(([, v]) => v).map(([lbl, val]) => (
                <div key={lbl} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-400">{lbl}</span>
                  <span className="font-semibold text-gray-700 text-right max-w-[55%]">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance summary */}
          {analytics && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                {[
                  { label: 'Total Appointments', value: analytics.totalAppointments },
                  { label: 'Unique Patients', value: analytics.patientLoad },
                  { label: 'This Week', value: analytics.weeklyBuckets?.slice(-1)[0]?.count ?? 0 },
                  { label: 'This Month', value: analytics.monthlyBuckets?.slice(-1)[0]?.count ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-2xl font-black text-emerald-700">{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: charts + appointments */}
        <div className="xl:col-span-2 space-y-5">
          {/* Monthly chart */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Monthly Appointment Volume (Last 6 Months)</h3>
            </div>
            {chartData ? (
              <Bar data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} height={100} />
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No appointments in this period.</div>
            )}
          </div>

          {/* Weekly chart */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Weekly Appointments (Last 4 Weeks)</h3>
            {weeklyChartData ? (
              <Bar data={weeklyChartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} height={80} />
            ) : (
              <div className="h-20 flex items-center justify-center text-gray-400 text-sm">No data.</div>
            )}
          </div>

          {/* Appointments table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">All Appointments ({appointments.length})</h3>
            </div>
            {appointments.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No appointments yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>{['Patient', 'Date', 'Reason', 'Status', 'Fee'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {appointments.slice(0, 20).map(a => (
                      <tr key={a._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/admin/patients/${a.patient?._id}`)}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.patient?.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{new Date(a.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate">{a.reason}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize
                            ${a.status === 'completed' ? 'bg-blue-100 text-blue-800' : a.status === 'approved' ? 'bg-green-100 text-green-800' : a.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-emerald-600 font-semibold">${a.consultationFee}</td>
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
