import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const REPORT_TYPES = [
  { key: 'appointment-trends', label: '📅 Appointment Trends', role: 'admin' },
  { key: 'doctor-performance', label: '👨‍⚕️ Doctor Performance', role: 'both' },
  { key: 'patient-health', label: '🧑‍⚕️ Patient Health', role: 'both' },
];

export default function AdminReports() {
  const [type, setType] = useState('appointment-trends');
  const [period, setPeriod] = useState('monthly');
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.allSettled([api.get('/analytics/admin/doctors'), api.get('/analytics/admin/patients')]).then(([dr, pr]) => {
      if (dr.status === 'fulfilled') setDoctors(dr.value.data.doctors || []);
      if (pr.status === 'fulfilled') setPatients(pr.value.data.patients || []);
    });
  }, []);

  const generateReport = async () => {
    setGenerating(true); setError(''); setReport(null);
    try {
      let url = '';
      if (type === 'appointment-trends') url = `/reports/generate/appointment-trends?period=${period}`;
      else if (type === 'doctor-performance') url = `/reports/generate/doctor-performance?period=${period}${selectedDoctor ? `&doctorId=${selectedDoctor}` : ''}`;
      else if (type === 'patient-health') {
        if (!selectedPatient) { setError('Please select a patient.'); setGenerating(false); return; }
        url = `/reports/generate/patient-health?period=${period}&patientId=${selectedPatient}`;
      }
      const r = await api.get(url);
      setReport(r.data.report);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report.');
    } finally { setGenerating(false); }
  };

  const exportCSV = async () => {
    let url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/export/csv?type=${type}&period=${period}`;
    if (type === 'patient-health' && selectedPatient) url += `&patientId=${selectedPatient}`;
    const token = localStorage.getItem('token');
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `healthconnect_${type}_${period}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm">Generate and export dynamic platform reports</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Report type */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Report Type</label>
            <select value={type} onChange={e => { setType(e.target.value); setReport(null); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
              {REPORT_TYPES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>

          {/* Period */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Period</label>
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Doctor selector */}
          {(type === 'doctor-performance') && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Doctor</label>
              <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                <option value="">All doctors</option>
                {doctors.map(d => <option key={d._id} value={d._id}>Dr. {d.name}</option>)}
              </select>
            </div>
          )}

          {/* Patient selector */}
          {type === 'patient-health' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Patient *</label>
              <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-600 font-semibold">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={generateReport} disabled={generating}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl transition disabled:opacity-60 text-sm">
            {generating ? '⏳ Generating...' : '⚡ Generate Report'}
          </button>
          {report && (
            <button onClick={exportCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2">
              📥 Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Report preview */}
      {report && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Summary header */}
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-black text-gray-900 text-lg capitalize">{report.type?.replace(/-/g, ' ')} Report</h3>
                <p className="text-sm text-gray-500">Period: <span className="font-semibold capitalize">{report.period}</span> · Generated: {new Date(report.generatedAt).toLocaleString()}</p>
              </div>
              <span className="text-xs bg-purple-200 text-purple-800 font-semibold px-3 py-1 rounded-full">Preview</span>
            </div>
          </div>

          {/* Summary stats */}
          {report.summary && (
            <div className="p-5 border-b border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(report.summary).filter(([k]) => typeof report.summary[k] !== 'object').map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-gray-900">{typeof v === 'number' ? (Number.isInteger(v) ? v : `$${v.toFixed(2)}`) : v}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.vitals && (
            <div className="p-5 border-b border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['Total Readings', report.vitals.totalReadings],
                  ['Avg Heart Rate', `${report.vitals.avgHR} bpm`],
                  ['Avg SpO₂', `${report.vitals.avgSpO2}%`],
                  ['Avg Temp', `${report.vitals.avgTemp}°C`],
                  ['Anomalies', report.vitals.anomalyCount],
                ].map(([lbl, val]) => (
                  <div key={lbl} className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-blue-800">{val}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data table */}
          {(report.appointments || report.trends || report.readings) && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {report.appointments && ['Date', 'Patient / Doctor', 'Reason', 'Status', 'Fee'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                    {report.trends && ['Period', 'Total', 'Completed', 'Pending', 'Revenue'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                    {report.readings && !report.appointments && ['Timestamp', 'Heart Rate', 'SpO₂', 'Temperature'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.appointments?.slice(0, 30).map((a, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(a.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.patient || a.doctor || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[140px] truncate">{a.reason || '—'}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${a.status === 'completed' ? 'bg-blue-100 text-blue-800' : a.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{a.status}</span></td>
                      <td className="px-4 py-3 text-sm text-emerald-600 font-semibold">${a.fee || 0}</td>
                    </tr>
                  ))}
                  {report.trends?.map((t, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{t._id}</td>
                      <td className="px-4 py-3 text-sm font-black text-purple-700">{t.total}</td>
                      <td className="px-4 py-3 text-sm text-emerald-600 font-semibold">{t.completed}</td>
                      <td className="px-4 py-3 text-sm text-yellow-600 font-semibold">{t.pending}</td>
                      <td className="px-4 py-3 text-sm text-blue-600 font-semibold">${t.revenue?.toFixed(2) || 0}</td>
                    </tr>
                  ))}
                  {!report.appointments && report.readings?.slice(0, 30).map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-600">{r.heartRate} bpm</td>
                      <td className="px-4 py-3 text-sm font-semibold text-blue-600">{r.spo2}%</td>
                      <td className="px-4 py-3 text-sm font-semibold text-orange-600">{r.temperature}°C</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
