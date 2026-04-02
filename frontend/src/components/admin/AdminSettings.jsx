import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function AdminSettings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const pending = users.filter(u => u.status === 'pending');
  const approved = users.filter(u => u.status === 'approved' && u.role !== 'admin');

  const doAction = async (id, action) => {
    try {
      await api.put(`/users/${id}/${action}`);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, status: action === 'approve' ? 'approved' : 'rejected' } : u));
      setActionMsg(`User ${action}d successfully.`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (e) { console.error(e); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(prev => prev.filter(u => u._id !== id));
      setActionMsg('User deleted.');
      setTimeout(() => setActionMsg(''), 3000);
    } catch (e) { console.error(e); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Settings & Control</h1>
        <p className="text-gray-500 text-sm">User approvals, system control, and admin overrides</p>
      </div>

      {actionMsg && (
        <div className="mb-4 bg-green-100 text-green-800 font-semibold px-4 py-3 rounded-xl text-sm">
          ✅ {actionMsg}
        </div>
      )}

      {/* Pending approvals */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <h3 className="font-bold text-gray-900">⏳ Pending Approvals</h3>
          {pending.length > 0 && (
            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              {pending.length} waiting
            </span>
          )}
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : pending.length === 0 ? (
          <div className="p-8 text-center text-gray-400">✅ No pending approvals.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {pending.map(u => (
              <div key={u._id} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm ${u.role === 'doctor' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email} · <span className="capitalize font-medium">{u.role}</span></p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => doAction(u._id, 'approve')}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition">
                    ✅ Approve
                  </button>
                  <button onClick={() => doAction(u._id, 'reject')}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition">
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All users management */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">👥 All Users ({approved.length} active)</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>{['User', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.filter(u => u.role !== 'admin').map(u => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-sm ${u.role === 'doctor' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${u.role === 'doctor' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${u.status === 'approved' ? 'bg-green-100 text-green-700' : u.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 flex gap-2">
                      {u.status === 'pending' && (
                        <button onClick={() => doAction(u._id, 'approve')}
                          className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 font-semibold transition">
                          Approve
                        </button>
                      )}
                      {u.status === 'approved' && (
                        <button onClick={() => doAction(u._id, 'reject')}
                          className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1.5 rounded-lg hover:bg-yellow-100 font-semibold transition">
                          Suspend
                        </button>
                      )}
                      <button onClick={() => deleteUser(u._id)}
                        className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 font-semibold transition">
                        Delete
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
