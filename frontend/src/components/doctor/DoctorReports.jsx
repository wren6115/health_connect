import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

export default function DoctorReports() {
  const { user } = useContext(AuthContext);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [period, setPeriod] = useState('weekly');
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/appointments').then(r => {
      const apts = r.data || [];
      const seen = new Set();
      const unique = [];
      apts.forEach(a => {
        if (a.patient?._id && !seen.has(a.patient._id)) {
          seen.add(a.patient._id);
          unique.push({ _id: a.patient._id, name: a.patient.name });
        }
      });
      setPatients(unique);
    }).catch(() => {});
  }, []);

  const generate = async () => {
    if (!selectedPatient) { setError('Please select a patient.'); return; }
    setGenerating(true); setError(''); setReport(null);
    try {
      const r = await api.get(`/reports/generate/patient-health?patientId=${selectedPatient}&period=${period}`);
      setReport(r.data.report);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to generate report.');
    } finally { setGenerating(false); }
  };

  const exportCSV = async () => {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/export/csv?type=patient-health&period=${period}&patientId=${selectedPatient}`;
    const token = localStorage.getItem('token');
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `patient_health_${period}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Patient Reports</h1>
        <p className="text-gray-500 text-sm">Generate health reports for your patients</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Patient *</label>
            <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300">
              <option value="">Select patient...</option>
              {patients.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Period</label>
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={generate} disabled={generating}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-60 text-sm">
              {generating ? '⏳ Generating...' : '⚡ Generate'}
            </button>
            {report && (
              <button onClick={exportCSV} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl transition text-sm">📥</button>
            )}
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600 font-semibold">{error}</p>}
      </div>

      {report && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <h3 className="font-black text-gray-900">Patient Health Report — {report.patient?.name}</h3>
            <p className="text-sm text-gray-500 mt-1">Period: <span className="font-semibold capitalize">{report.period}</span> · Generated: {new Date(report.generatedAt).toLocaleString()}</p>
          </div>
          <div className="p-5 border-b border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              {[
                ['Total Readings', report.vitals.totalReadings],
                ['Avg HR', `${report.vitals.avgHR} bpm`],
                ['Avg SpO₂', `${report.vitals.avgSpO2}%`],
                ['Avg Temp', `${report.vitals.avgTemp}°C`],
                ['Anomalies', report.vitals.anomalyCount],
              ].map(([lbl, val]) => (
                <div key={lbl} className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-xl font-black text-emerald-800">{val}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{lbl}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>{['Timestamp', 'Heart Rate', 'SpO₂', 'Temperature'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.readings?.slice(0, 30).map((r, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${(r.heartRate < 50 || r.heartRate > 100 || r.spo2 < 92 || r.temperature < 35 || r.temperature > 38) ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">{r.heartRate} bpm</td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">{r.spo2}%</td>
                    <td className="px-4 py-3 text-sm font-semibold text-orange-600">{r.temperature}°C</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
