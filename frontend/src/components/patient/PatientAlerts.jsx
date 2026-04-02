import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

export default function PatientAlerts() {
  const { user } = useContext(AuthContext);
  const [symptoms, setSymptoms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // There is no dedicated /alerts/patient/:id endpoint that returns array of raw alerts easily in the existing structure,
    // but the patient can see their symptom reports which count as alerts.
    // If the system generates automated alerts, they are mostly live.
    // We'll fetch from /symptoms as historical
    api.get('/symptoms').then(r => {
      // Assuming /symptoms returns all, filter by this user if backend doesn't
      // In a real app backend would filter, but just in case:
      const mine = (r.data || []).filter(s => s.patient?._id === user._id || s.patient === user._id);
      setSymptoms(mine);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Alert History</h1>
        <p className="text-gray-500 text-sm">Your past self-reported symptoms and system alerts</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Symptom Reports</h3>
        </div>
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading history...</div>
        ) : symptoms.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No symptom alerts found.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {symptoms.map(s => (
              <li key={s._id} className="p-5 flex items-start gap-4">
                <div className={`mt-1 p-2 rounded-full ${s.severity === 'high' ? 'bg-red-100 text-red-600' : s.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                  ⚠️
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{new Date(s.createdAt).toLocaleString()}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${s.severity === 'high' ? 'bg-red-100 text-red-700' : s.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{s.severity}</span>
                  </div>
                  <p className="text-gray-700">"{s.message}"</p>
                  <p className="text-xs text-gray-400 mt-2">Status: <span className="uppercase font-semibold">{s.status}</span></p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
