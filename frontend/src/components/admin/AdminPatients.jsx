import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const riskBadge = { high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700' };

export default function AdminPatients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  useEffect(() => {
    api.get('/analytics/admin/patients')
      .then(r => { setPatients(r.data.patients); setFiltered(r.data.patients); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = patients;
    if (search) list = list.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()));
    if (riskFilter !== 'all') list = list.filter(p => p.riskLevel === riskFilter);
    setFiltered(list);
  }, [search, riskFilter, patients]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Patients</h1>
          <p className="text-gray-500 text-sm">All registered patients — {patients.length} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex flex-wrap gap-3">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by name or email..."
          className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
        <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
          <option value="all">All Risk Levels</option>
          <option value="high">🔴 High Risk</option>
          <option value="medium">🟡 Medium Risk</option>
          <option value="low">🟢 Low Risk</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading patients...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No patients found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                <tr>
                  {['Patient', 'Age / Gender', 'Assigned Doctor', 'Risk Level', 'Alerts', 'Last Vitals', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr key={p._id} className="hover:bg-purple-50 transition cursor-pointer" onClick={() => navigate(`/admin/patients/${p._id}`)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {p.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{p.age ? `${p.age} yrs` : '—'} / {p.gender || '—'}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{p.assignedDoctor ? `Dr. ${p.assignedDoctor.name}` : <span className="text-orange-400 text-xs font-semibold">Unassigned</span>}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${riskBadge[p.riskLevel]}`}>
                        {p.riskLevel}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">{p.alertCount}</td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {p.lastReading ? (
                        <span>HR: {p.lastReading.heartRate} · SpO₂: {p.lastReading.spo2}%</span>
                      ) : 'No data'}
                    </td>
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/admin/patients/${p._id}`)}
                        className="text-xs text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50 font-semibold transition">
                        View →
                      </button>
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
