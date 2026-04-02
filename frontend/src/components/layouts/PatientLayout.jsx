import React, { useState, useContext } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const nav = [
  { to: '/patient/dashboard', icon: '❤️', label: 'Live Vitals'    },
  { to: '/patient/reports',   icon: '📄', label: 'My Reports'     },
  { to: '/patient/history',   icon: '📈', label: 'Health History' },
  { to: '/patient/alerts',    icon: '🔔', label: 'Alert History'  },
  { to: '/patient/doctor',    icon: '👨‍⚕️', label: 'My Doctor'     },
];

export default function PatientLayout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} flex-shrink-0 bg-gradient-to-b from-blue-800 to-cyan-900 text-white flex flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-blue-700/50">
          <div className="bg-blue-500 rounded-lg p-1.5 flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          {sidebarOpen && <span className="ml-3 font-black text-base truncate">HealthConnect</span>}
        </div>

        {/* Patient card */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-b border-blue-700/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <span className="text-xs bg-blue-600/60 text-blue-200 px-1.5 py-0.5 rounded-full">Patient</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {nav.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-150 mx-2 rounded-xl mb-0.5
                ${isActive ? 'bg-white/20 text-white shadow-inner' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`
              }
            >
              <span className="text-lg flex-shrink-0">{icon}</span>
              {sidebarOpen && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Quick actions */}
        {sidebarOpen && (
          <div className="mx-3 mb-3 space-y-2">
            <button
              onClick={() => navigate('/appointment')}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold py-2 rounded-xl transition"
            >
              📅 Book Appointment
            </button>
            <button
              onClick={() => navigate('/videocall')}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-2 rounded-xl transition"
            >
              📹 Video Consult
            </button>
          </div>
        )}

        {/* Logout */}
        <div className="p-4 border-t border-blue-700/50">
          <button
            onClick={() => { logout(); navigate('/'); }}
            className={`flex items-center gap-2 text-blue-300 hover:text-red-300 text-sm font-medium transition w-full ${sidebarOpen ? '' : 'justify-center'}`}
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
          <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
            💙 Patient Portal
          </span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
