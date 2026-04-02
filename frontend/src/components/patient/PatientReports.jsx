import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

export default function PatientReports() {
  const { user } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We already have a reports/history/:patientId endpoint that we can use
    if (!user) return;
    api.get(`/reports/history/${user._id}`)
      .then(r => setReports(r.data.reports || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">My Reports</h1>
        <p className="text-gray-500 text-sm">View your historical health monitoring reports</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No reports generated yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>{['Date', 'Average HR', 'Average SpO₂', 'Anomalies', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.map(r => (
                  <tr key={r._id} className="hover:bg-blue-50 transition cursor-pointer">
                    <td className="px-5 py-4 text-sm text-gray-900 font-medium">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-red-600">{r.aggregatedVitals?.avgHR?.toFixed(1) || '—'} bpm</td>
                    <td className="px-5 py-4 text-sm font-semibold text-blue-600">{r.aggregatedVitals?.avgSpO2?.toFixed(1) || '—'}%</td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {r.anomalies?.abnormalHR ? <span className="mr-1 text-red-500">HR</span> : ''}
                      {r.anomalies?.abnormalSpO2 ? <span className="mr-1 text-blue-500">O2</span> : ''}
                      {!r.anomalies?.abnormalHR && !r.anomalies?.abnormalSpO2 ? 'None' : ''}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${r.status === 'reviewed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {r.status}
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
