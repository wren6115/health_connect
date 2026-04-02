import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function AdminDoctors() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specFilter, setSpecFilter] = useState('all');
  const [specialties, setSpecialties] = useState([]);

  useEffect(() => {
    api.get('/analytics/admin/doctors')
      .then(r => {
        setDoctors(r.data.doctors);
        setFiltered(r.data.doctors);
        const specs = [...new Set(r.data.doctors.map(d => d.specialization).filter(Boolean))];
        setSpecialties(specs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = doctors;
    if (search) list = list.filter(d => d.name?.toLowerCase().includes(search.toLowerCase()));
    if (specFilter !== 'all') list = list.filter(d => d.specialization === specFilter);
    setFiltered(list);
  }, [search, specFilter, doctors]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Doctors</h1>
        <p className="text-gray-500 text-sm">All registered doctors — {doctors.length} total</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex flex-wrap gap-3">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search doctors..."
          className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
        <select value={specFilter} onChange={e => setSpecFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
          <option value="all">All Specialties</option>
          {specialties.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading doctors...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(doc => (
            <div
              key={doc._id}
              onClick={() => navigate(`/admin/doctors/${doc._id}`)}
              className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow cursor-pointer border border-gray-100 p-5"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black text-xl flex-shrink-0">
                  {doc.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 truncate">Dr. {doc.name}</p>
                  <p className="text-xs text-gray-400 truncate">{doc.email}</p>
                  <span className="inline-block mt-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                    {doc.specialization}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Patients', value: doc.patientCount },
                  { label: 'This Month', value: doc.appointmentsThisMonth },
                  { label: 'Total Appts', value: doc.totalAppointments },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-2">
                    <p className="text-lg font-black text-gray-900">{value}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400">★</span>
                  <span className="text-sm font-semibold text-gray-700">{doc.rating?.toFixed(1) || '—'}</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${doc.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {doc.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
