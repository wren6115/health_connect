import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import api from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function AdminPatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState({ user: null, profile: null, lastReading: null });
  const [analytics, setAnalytics] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [userRes, analyticsRes, aptsRes, docRes] = await Promise.allSettled([
        api.get(`/users/${id}/full`),
        api.get(`/analytics/patient/${id}`),
        api.get(`/appointments/by-patient/${id}`),
        api.get('/doctors'),
      ]);
      if (userRes.status === 'fulfilled') setData(userRes.value.data);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
      if (aptsRes.status === 'fulfilled') setAppointments(aptsRes.value.data.appointments || []);
      if (docRes.status === 'fulfilled') setDoctors(docRes.value.data.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  const handleAssignDoctor = async () => {
    if (!selectedDoctor) return;
    try {
      await api.put(`/users/${id}/assign-doctor`, { doctorId: selectedDoctor });
      const r = await api.get(`/users/${id}/full`);
      setData(r.data);
      setAssigning(false);
    } catch (e) { console.error(e); }
  };

  const vitalChartData = analytics?.chartData?.labels?.length ? {
    labels: analytics.chartData.labels,
    datasets: [
      { label: 'Heart Rate (bpm)', data: analytics.chartData.hrData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.4, fill: true },
      { label: 'SpO₂ (%)', data: analytics.chartData.spo2Data, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.4, fill: true },
      { label: 'Temp (°C)', data: analytics.chartData.tempData, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', tension: 0.4, fill: true },
    ]
  } : null;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading patient data...</div>;
  if (!data.user) return <div className="flex items-center justify-center h-64 text-gray-400">Patient not found.</div>;

  const { user, profile } = data;
  const riskColor = analytics?.riskLevel === 'high' ? 'text-red-600 bg-red-50' : analytics?.riskLevel === 'medium' ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/patients')} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition">
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900">{user.name}</h1>
          <p className="text-sm text-gray-400">{user.email} · {user.phone}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: patient info */}
        <div className="space-y-5">
          {/* Profile card */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-black">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-lg">{user.name}</h3>
                <p className="text-gray-400 text-sm">{profile?.age} yrs · {profile?.gender}</p>
                {analytics?.riskLevel && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block capitalize ${riskColor}`}>
                    Risk: {analytics.riskLevel}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Emergency Contact', profile?.emergencyContactName],
                ['Emergency Phone', profile?.emergencyContactPhone],
                ['Account Status', user.status],
              ].map(([lbl, val]) => val && (
                <div key={lbl} className="flex justify-between">
                  <span className="text-gray-400">{lbl}</span>
                  <span className="font-semibold text-gray-700 capitalize">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Doctor */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900">Assigned Doctor</h3>
              <button onClick={() => setAssigning(a => !a)} className="text-xs text-purple-600 font-semibold hover:underline">
                {assigning ? 'Cancel' : '✏️ Reassign'}
              </button>
            </div>
            {profile?.doctorId ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                  {profile.doctorId.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Dr. {profile.doctorId.name}</p>
                  <p className="text-xs text-gray-400">{profile.doctorId.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-orange-500 text-sm font-semibold">⚠️ No doctor assigned</p>
            )}
            {assigning && (
              <div className="mt-3 space-y-2">
                <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                  <option value="">Select a doctor...</option>
                  {doctors.map(d => <option key={d._id} value={d._id}>Dr. {d.name} — {d.specialization}</option>)}
                </select>
                <button onClick={handleAssignDoctor}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold py-2 rounded-xl transition">
                  Confirm Assignment
                </button>
              </div>
            )}
          </div>

          {/* Analytics summary */}
          {analytics && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-3">Health Summary (7 days)</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                {[
                  { label: 'Readings', value: analytics.totalReadings },
                  { label: 'Alerts', value: analytics.alertCount },
                  { label: 'Appointments', value: analytics.appointmentCount },
                  { label: 'Risk Score', value: `${analytics.riskScore}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xl font-black text-gray-900">{value}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: charts + appointments */}
        <div className="xl:col-span-2 space-y-5">
          {/* Vitals chart */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Vitals Trend (Last 7 Days)</h3>
            {vitalChartData ? (
              <Line data={vitalChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: false } } }} height={90} />
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No vitals data in last 7 days.</div>
            )}
          </div>

          {/* Appointment history */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Appointment History ({appointments.length})</h3>
            </div>
            {appointments.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No appointments yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Date', 'Doctor', 'Reason', 'Status', 'Fee'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {appointments.map(a => (
                      <tr key={a._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{new Date(a.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">Dr. {a.doctor?.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate">{a.reason}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize
                            ${a.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              a.status === 'approved' ? 'bg-green-100 text-green-800' :
                              a.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'}`}>
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
