import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

const riskBadge = { high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700' };

export default function DoctorPatients() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/appointments').then(r => {
      const apts = r.data || [];
      setAppointments(apts);
      // Derive unique patients from appointments
      const seen = new Set();
      const unique = [];
      apts.forEach(a => {
        if (a.patient?._id && !seen.has(a.patient._id)) {
          seen.add(a.patient._id);
          const patientApts = apts.filter(x => x.patient?._id === a.patient._id);
          unique.push({
            _id: a.patient._id,
            name: a.patient.name,
            email: a.patient.email,
            lastVisit: patientApts.sort((x, y) => new Date(y.date) - new Date(x.date))[0]?.date,
            appointmentCount: patientApts.length,
          });
        }
      });
      setPatients(unique);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? patients.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()))
    : patients;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">My Patients</h1>
        <p className="text-gray-500 text-sm">{patients.length} patient{patients.length !== 1 ? 's' : ''} seen</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search patients..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading patients...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No patients found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(p => (
            <div key={p._id} onClick={() => navigate(`/doctor/patients/${p._id}`)}
              className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow cursor-pointer border border-gray-100 p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xl font-black flex-shrink-0">
                  {p.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 truncate">{p.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-50 rounded-xl p-2">
                  <p className="text-lg font-black text-gray-900">{p.appointmentCount}</p>
                  <p className="text-xs text-gray-400">Appointments</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2">
                  <p className="text-sm font-semibold text-gray-700">{p.lastVisit ? new Date(p.lastVisit).toLocaleDateString() : '—'}</p>
                  <p className="text-xs text-gray-400">Last Visit</p>
                </div>
              </div>
              <div className="mt-3 text-right">
                <span className="text-xs text-emerald-600 font-semibold">View Details →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
