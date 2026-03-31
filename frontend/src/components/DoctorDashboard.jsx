import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import io from 'socket.io-client';
import api from '../services/api';
import Chatbot from './Chatbot';

const SOCKET_URL = 'http://localhost:5000';

const DoctorDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (!user) { navigate('/login'); return; }

        // Join the shared doctor+admin socket room to receive patient alerts
        const socket = io(SOCKET_URL, { transports: ['websocket'] });
        socket.emit('join_room', 'admin_and_doctors');

        socket.on('escalated_alert', (payload) => {
            setAlerts(prev => [{ 
                ...payload, 
                type: 'Escalation',
                time: new Date() 
            }, ...prev.slice(0, 19)]);
        });

        socket.on('sos_triggered', (payload) => {
            setAlerts(prev => [{ type: 'Manual SOS', severity: 'critical', message: `🚨 Manual SOS from ${payload.patientName}`, time: new Date() }, ...prev.slice(0, 19)]);
        });

        // Fetch appointments and patients
        const fetchData = async () => {
            try {
                const [aptsRes] = await Promise.allSettled([api.get('/appointments')]);
                if (aptsRes.status === 'fulfilled') setAppointments(aptsRes.value.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchData();

        return () => socket.disconnect();
    }, [user, navigate]);

    const tabs = [
        { id: 'overview', label: '📊 Overview' },
        { id: 'appointments', label: '📅 Appointments' },
        { id: 'alerts', label: `🚨 Alerts${alerts.length > 0 ? ` (${alerts.length})` : ''}` },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center space-x-3">
                            <div className="bg-green-600 rounded-lg p-1.5">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <span className="font-black text-gray-900">HealthConnect</span>
                            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">Doctor Portal</span>
                        </div>

                        {/* Quick Nav Links */}
                        <div className="hidden md:flex items-center space-x-1">
                            {[
                                { to: '/appointment', label: '📅 Appointments' },
                                { to: '/videocall', label: '📹 Video Call' },
                                { to: '/notifications', label: '🔔 Notifications' },
                            ].map(({ to, label }) => (
                                <Link key={to} to={to}
                                    className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition">
                                    {label}
                                </Link>
                            ))}
                        </div>

                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm">
                                {user?.name?.[0]?.toUpperCase()}
                            </div>
                            <span className="hidden sm:block text-sm font-medium text-gray-700">Dr. {user?.name}</span>
                            <button onClick={() => { logout(); navigate('/'); }}
                                className="flex items-center text-sm text-red-500 hover:text-red-700 font-medium">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-black text-gray-900">Doctor Dashboard</h1>
                    <p className="text-gray-500 text-sm">Manage your patients, appointments, and health alerts</p>
                </div>

                {/* Quick Action Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Appointments', icon: '📅', to: '/appointment', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                        { label: 'Video Call', icon: '📹', to: '/videocall', color: 'bg-green-50 text-green-700 border-green-200' },
                        { label: 'Notifications', icon: '🔔', to: '/notifications', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                        { label: 'Active Alerts', icon: '🚨', count: alerts.length, color: alerts.length > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200' },
                    ].map(({ label, icon, to, count, color }) => (
                        <div key={label}
                            onClick={() => to ? navigate(to) : setActiveTab('alerts')}
                            className={`rounded-2xl p-4 text-center cursor-pointer hover:shadow-md transition border-2 ${color}`}>
                            <div className="text-2xl mb-1">{icon}</div>
                            {count !== undefined && <div className="text-3xl font-black">{loading ? '—' : count}</div>}
                            <div className="text-xs font-semibold mt-0.5">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit overflow-x-auto">
                    {tabs.map(({ id, label }) => (
                        <button key={id} onClick={() => setActiveTab(id)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
                                ${activeTab === id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Appointments */}
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-900">Recent Appointments</h3>
                                <Link to="/appointment" className="text-blue-600 text-sm font-semibold hover:underline">View all →</Link>
                            </div>
                            {appointments.length === 0 ? (
                                <p className="text-gray-400 text-sm">No appointments yet.</p>
                            ) : appointments.slice(0, 5).map(apt => (
                                <div key={apt._id} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{apt.patient?.name || 'Patient'}</p>
                                        <p className="text-xs text-gray-400">{new Date(apt.date).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize
                                        ${apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            apt.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {apt.status}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Alert Summary */}
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-900">Live Patient Alerts</h3>
                                <span className="text-xs text-gray-400">Real-time</span>
                            </div>
                            {alerts.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <p className="text-3xl mb-2">✅</p>
                                    <p className="text-sm">No active alerts</p>
                                </div>
                            ) : alerts.slice(0, 5).map((a, i) => (
                                <div key={i} className={`flex items-start gap-2 py-2.5 border-b border-gray-50 last:border-0`}>
                                    <span className="text-lg">{a.severity === 'critical' ? '🚨' : '⚠️'}</span>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{a.message}</p>
                                        <p className="text-xs text-gray-400">{a.patientName} · {a.time?.toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Appointments Tab */}
                {activeTab === 'appointments' && (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="font-bold text-gray-900">All Appointments</h2>
                            <Link to="/appointment" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700 font-semibold">
                                + Book New
                            </Link>
                        </div>
                        {appointments.length === 0 ? (
                            <div className="p-10 text-center text-gray-400">No appointments found.</div>
                        ) : (
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>{['Patient', 'Date', 'Status', 'Fee'].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}</tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {appointments.map(apt => (
                                        <tr key={apt._id} className="hover:bg-gray-50">
                                            <td className="px-5 py-3 text-sm font-medium text-gray-900">{apt.patient?.name}</td>
                                            <td className="px-5 py-3 text-sm text-gray-500">{new Date(apt.date).toLocaleDateString()}</td>
                                            <td className="px-5 py-3">
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize
                                                    ${apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        apt.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {apt.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-emerald-600 font-semibold">${apt.consultationFee}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Alerts Tab */}
                {activeTab === 'alerts' && (
                    <div className="space-y-3">
                        <h2 className="font-bold text-gray-900 mb-3">Live Patient Alerts</h2>
                        {alerts.length === 0 ? (
                            <div className="bg-white rounded-2xl p-10 text-center text-gray-400">
                                <p className="text-4xl mb-2">✅</p>
                                <p>All patients are stable — no alerts</p>
                            </div>
                        ) : alerts.map((a, i) => (
                            <div key={i} className={`bg-white rounded-2xl shadow-sm p-4 border-l-4
                                ${a.severity === 'critical' ? 'border-red-500' : 'border-orange-400'}`}>
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">{a.severity === 'critical' ? '🚨' : '⚠️'}</span>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">{a.message}</p>
                                        <p className="text-sm text-gray-500 mt-0.5">Patient: {a.patientName} · {a.time?.toLocaleTimeString()}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full self-start
                                        ${a.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {a.type}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Floating Chatbot */}
            <Chatbot />
        </div>
    );
};

export default DoctorDashboard;
