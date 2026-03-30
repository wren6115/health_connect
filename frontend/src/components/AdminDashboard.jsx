import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const roleColors = { admin: 'bg-purple-100 text-purple-700', doctor: 'bg-green-100 text-green-700', patient: 'bg-blue-100 text-blue-700' };

const AdminDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [data, setData] = useState({ users: [], appointments: [], symptoms: [] });
    const [revenue, setRevenue] = useState({ totalRevenue: 0, platformRevenue: 0, doctorPayouts: 0, transactionCount: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [deleteId, setDeleteId] = useState(null);

    useEffect(() => {
        const fetchAll = async () => {
            const results = await Promise.allSettled([
                api.get('/users'),
                api.get('/appointments'),
                api.get('/symptoms'),
                api.get('/transactions/stats')
            ]);
            setData({
                users: results[0].status === 'fulfilled' ? results[0].value.data : [],
                appointments: results[1].status === 'fulfilled' ? results[1].value.data : [],
                symptoms: results[2].status === 'fulfilled' ? results[2].value.data : [],
            });
            if (results[3].status === 'fulfilled') setRevenue(results[3].value.data);
            setLoading(false);
        };
        fetchAll();
    }, []);

    const deleteUser = async (id) => {
        try {
            await api.delete(`/users/${id}`);
            setData(prev => ({ ...prev, users: prev.users.filter(u => u._id !== id) }));
            setDeleteId(null);
        } catch (err) { console.error(err); }
    };

    const urgentAlerts = data.symptoms.filter(s => s.severity === 'high' && s.status === 'new');

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Delete Confirm Modal */}
            {deleteId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
                        <div className="text-4xl mb-3">⚠️</div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete User?</h3>
                        <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
                        <div className="flex space-x-3">
                            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50">Cancel</button>
                            <button onClick={() => deleteUser(deleteId)} className="flex-1 py-2.5 bg-red-600 rounded-xl text-white font-semibold hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navbar */}
            <nav className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center space-x-3">
                            <div className="bg-purple-600 rounded-lg p-1.5">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <span className="font-black text-gray-900">HealthConnect</span>
                            <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">Admin</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            {urgentAlerts.length > 0 && (
                                <div onClick={() => setActiveTab('alerts')} className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse cursor-pointer">
                                    🚨 {urgentAlerts.length} Urgent
                                </div>
                            )}
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center text-white font-bold text-sm">
                                    {user?.name?.[0]?.toUpperCase()}
                                </div>
                                <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.name}</span>
                            </div>
                            <button onClick={() => { logout(); navigate('/'); }} className="flex items-center text-sm text-red-500 hover:text-red-700 font-medium">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-black text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-500 text-sm">Full administrative control over HealthConnect</p>
                </div>

                {/* Revenue Banner */}
                <div className="rounded-2xl p-6 text-white mb-6" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #7c3aed 100%)' }}>
                    <p className="text-purple-200 text-sm mb-1">Platform Revenue (Total)</p>
                    <div className="flex items-end justify-between flex-wrap gap-4">
                        <p className="text-5xl font-black">${loading ? '–' : revenue.totalRevenue.toFixed(2)}</p>
                        <div className="grid grid-cols-3 gap-4 text-right">
                            <div>
                                <p className="text-purple-200 text-xs">Platform Fee (10%)</p>
                                <p className="text-xl font-black">${loading ? '–' : revenue.platformRevenue.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-purple-200 text-xs">Doctor Payouts (90%)</p>
                                <p className="text-xl font-black">${loading ? '–' : revenue.doctorPayouts.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-purple-200 text-xs">Transactions</p>
                                <p className="text-xl font-black">{loading ? '–' : revenue.transactionCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {[
                        ['Total Users', data.users.length, 'bg-blue-50 text-blue-600', '👥'],
                        ['Appointments', data.appointments.length, 'bg-green-50 text-green-600', '📅'],
                        ['Doctors', data.users.filter(u => u.role === 'doctor').length, 'bg-emerald-50 text-emerald-600', '👨‍⚕️'],
                        ['Urgent Alerts', urgentAlerts.length, 'bg-red-50 text-red-600', '🚨'],
                    ].map(([label, value, cls, icon]) => (
                        <div key={label} className={`${cls.split(' ')[0]} rounded-2xl p-4 text-center`}>
                            <div className="text-2xl mb-1">{icon}</div>
                            <div className={`text-3xl font-black ${cls.split(' ')[1]}`}>{loading ? '—' : value}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit overflow-x-auto">
                    {[['overview', '📊 Overview'], ['users', '👥 Users'], ['appointments', '📅 Appointments'], ['alerts', '🚨 Alerts']].map(([tab, label]) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Overview */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Users by Role</h3>
                            {['admin', 'doctor', 'patient'].map(role => {
                                const count = data.users.filter(u => u.role === role).length;
                                const pct = data.users.length ? Math.round(count / data.users.length * 100) : 0;
                                return (
                                    <div key={role} className="mb-4">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="capitalize font-medium text-gray-700">{role}</span>
                                            <span className="text-gray-500">{count}</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-2 rounded-full transition-all ${role === 'admin' ? 'bg-purple-500' : role === 'doctor' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm p-6 lg:col-span-2">
                            <h3 className="font-bold text-gray-900 mb-4">Recent Appointments</h3>
                            {data.appointments.length === 0 ? (
                                <p className="text-gray-400 text-sm">No appointments yet.</p>
                            ) : data.appointments.slice(0, 6).map(apt => (
                                <div key={apt._id} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{apt.patient?.name}</p>
                                        <p className="text-xs text-gray-400">→ Dr. {apt.doctor?.name} • {new Date(apt.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {apt.paymentStatus === 'paid' && <span className="text-xs text-emerald-600 font-semibold">${apt.consultationFee}</span>}
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : apt.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{apt.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100">
                            <h2 className="font-bold text-gray-900">All Users ({data.users.length})</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['User', 'Role', 'Specialization', 'Actions'].map(h => (
                                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data.users.map(u => (
                                        <tr key={u._id} className="hover:bg-gray-50">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: u.role === 'admin' ? '#9333ea' : u.role === 'doctor' ? '#16a34a' : '#2563eb' }}>
                                                        {u.name?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{u.name}</p>
                                                        <p className="text-xs text-gray-400">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${roleColors[u.role]}`}>{u.role}</span>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-gray-500">{u.specialization || '—'}</td>
                                            <td className="px-5 py-4 text-right">
                                                {u.role !== 'admin' && (
                                                    <button onClick={() => setDeleteId(u._id)} className="text-xs text-red-600 hover:text-red-800 font-semibold border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">Delete</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {data.users.length === 0 && <div className="p-8 text-center text-gray-400">No users found.</div>}
                        </div>
                    </div>
                )}

                {/* Appointments Tab */}
                {activeTab === 'appointments' && (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100">
                            <h2 className="font-bold text-gray-900">All Appointments ({data.appointments.length})</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['Patient', 'Doctor', 'Date', 'Fee', 'Status'].map(h => (
                                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data.appointments.map(apt => (
                                        <tr key={apt._id} className="hover:bg-gray-50">
                                            <td className="px-5 py-3 text-sm font-medium text-gray-900">{apt.patient?.name}</td>
                                            <td className="px-5 py-3 text-sm text-gray-500">Dr. {apt.doctor?.name}</td>
                                            <td className="px-5 py-3 text-sm text-gray-500">{new Date(apt.date).toLocaleDateString()}</td>
                                            <td className="px-5 py-3 text-sm text-emerald-600 font-semibold">${apt.consultationFee}</td>
                                            <td className="px-5 py-3">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : apt.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{apt.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {data.appointments.length === 0 && <div className="p-8 text-center text-gray-400">No appointments yet.</div>}
                        </div>
                    </div>
                )}

                {/* Alerts Tab */}
                {activeTab === 'alerts' && (
                    <div className="space-y-3">
                        <h2 className="font-bold text-gray-900 mb-3">Symptom Reports ({data.symptoms.length})</h2>
                        {data.symptoms.length > 0 ? data.symptoms.map(symp => (
                            <div key={symp._id} className={`bg-white rounded-2xl shadow-sm p-4 border-l-4 ${symp.severity === 'high' ? 'border-red-500' : symp.severity === 'medium' ? 'border-yellow-400' : 'border-blue-400'}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${symp.severity === 'high' ? 'bg-red-100 text-red-700' : symp.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{symp.severity}</span>
                                            <span className="font-semibold text-gray-900 text-sm">{symp.patient?.name}</span>
                                            <span className="text-xs text-gray-400">{new Date(symp.createdAt).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 italic">"{symp.message}"</p>
                                    </div>
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full self-start ${symp.status === 'new' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{symp.status}</span>
                                </div>
                            </div>
                        )) : <div className="bg-white rounded-2xl p-8 text-center text-gray-400">No symptom reports yet.</div>}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;
