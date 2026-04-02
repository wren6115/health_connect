import React, { useState, useContext, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import socket from '../../services/socketService';

export default function DoctorLayout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    socket.emit('join_room', 'admin_and_doctors');
    const onAlert = () => setAlertCount(c => c + 1);
    socket.on('escalated_alert', onAlert);
    socket.on('sos_triggered', onAlert);
    return () => {
      socket.off('escalated_alert', onAlert);
      socket.off('sos_triggered', onAlert);
    };
  }, []);

  const nav = [
    { to: '/doctor/dashboard',     icon: '📊', label: 'Dashboard'    },
    { to: '/doctor/patients',      icon: '🧑‍⚕️', label: 'My Patients'  },
    { to: '/doctor/appointments',  icon: '📅', label: 'Appointments' },
    { to: '/doctor/reports',       icon: '📄', label: 'Reports'      },
    { to: '/doctor/alerts',        icon: '🚨', label: 'Alerts', badge: alertCount },
    { to: '/doctor/profile',       icon: '👤', label: 'Profile'      },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} flex-shrink-0 bg-gradient-to-b from-emerald-800 to-teal-900 text-white flex flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-emerald-700/50">
          <div className="bg-emerald-500 rounded-lg p-1.5 flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          {sidebarOpen && <span className="ml-3 font-black text-base truncate">HealthConnect</span>}
        </div>

        {/* Doctor card */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-b border-emerald-700/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">Dr. {user?.name}</p>
                <span className="text-xs bg-emerald-600/60 text-emerald-200 px-1.5 py-0.5 rounded-full">Doctor</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {nav.map(({ to, icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => { if (to === '/doctor/alerts') setAlertCount(0); }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-150 mx-2 rounded-xl mb-0.5
                ${isActive ? 'bg-white/20 text-white shadow-inner' : 'text-emerald-200 hover:bg-white/10 hover:text-white'}`
              }
            >
              <span className="text-lg flex-shrink-0">{icon}</span>
              {sidebarOpen && <span className="truncate flex-1">{label}</span>}
              {sidebarOpen && badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                  {badge}
                </span>
              )}
              {!sidebarOpen && badge > 0 && (
                <span className="absolute ml-5 mt-[-24px] bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-emerald-700/50">
          <button
            onClick={() => { logout(); navigate('/'); }}
            className={`flex items-center gap-2 text-emerald-300 hover:text-red-300 text-sm font-medium transition w-full ${sidebarOpen ? '' : 'justify-center'}`}
          >
            <span className="text-lg flex-shrink-0">🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0 z-10">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <div className="flex-1" />
          {alertCount > 0 && (
            <span className="text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full animate-pulse">
              🚨 {alertCount} new alert{alertCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
            🩺 Doctor Portal
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
