import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    api.get('/appointments').then(r => {
      const apts = r.data || [];
      setAppointments(apts);
      setFiltered(apts);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = appointments;
    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter);
    if (search) list = list.filter(a => a.patient?.name?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(list);
  }, [statusFilter, search, appointments]);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await api.put(`/appointments/${id}/status`, { status });
      setAppointments(prev => prev.map(a => a._id === id ? { ...a, status } : a));
    } catch (e) { console.error(e); }
    finally { setUpdating(null); }
  };

  // Weekly chart data
  const weeklyCount = [0, 1, 2, 3].map(weeksAgo => {
    const start = new Date(); start.setDate(start.getDate() - (weeksAgo + 1) * 7);
    const end = new Date(); end.setDate(end.getDate() - weeksAgo * 7);
    return appointments.filter(a => new Date(a.date) >= start && new Date(a.date) <= end).length;
  }).reverse();

  const chartData = {
    labels: ['3 weeks ago', '2 weeks ago', 'Last week', 'This week'],
    datasets: [{ label: 'Appointments', data: weeklyCount, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 8 }]
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Appointments</h1>
        <p className="text-gray-500 text-sm">{appointments.length} total appointments</p>
      </div>

      {/* Weekly chart */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h3 className="font-bold text-gray-900 mb-4">Weekly Volume (Last 4 Weeks)</h3>
        <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} height={80} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search by patient..."
          className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'approved', 'completed', 'cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition capitalize ${statusFilter === s ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading appointments...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No appointments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>{['Patient', 'Date', 'Reason', 'Fee', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(apt => (
                  <tr key={apt._id} className="hover:bg-emerald-50 transition">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{apt.patient?.name}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{new Date(apt.date).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-sm text-gray-500 max-w-[160px] truncate">{apt.reason}</td>
                    <td className="px-5 py-4 text-sm text-emerald-600 font-semibold">${apt.consultationFee}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[apt.status]}`}>{apt.status}</span>
                    </td>
                    <td className="px-5 py-4 flex gap-2">
                      {apt.status === 'pending' && (
                        <button disabled={updating === apt._id} onClick={() => updateStatus(apt._id, 'approved')}
                          className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 font-semibold transition disabled:opacity-50">
                          Approve
                        </button>
                      )}
                      {apt.status === 'approved' && (
                        <button disabled={updating === apt._id} onClick={() => updateStatus(apt._id, 'completed')}
                          className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-semibold transition disabled:opacity-50">
                          Complete
                        </button>
                      )}
                      {['pending', 'approved'].includes(apt.status) && (
                        <button disabled={updating === apt._id} onClick={() => updateStatus(apt._id, 'cancelled')}
                          className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 font-semibold transition disabled:opacity-50">
                          Cancel
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
  );
}
