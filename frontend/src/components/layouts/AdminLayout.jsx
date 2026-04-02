import React, { useState, useContext } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const nav = [
  { to: '/admin/dashboard',  icon: '📊', label: 'Dashboard'  },
  { to: '/admin/patients',   icon: '🧑‍⚕️', label: 'Patients'   },
  { to: '/admin/doctors',    icon: '👨‍⚕️', label: 'Doctors'    },
  { to: '/admin/analytics',  icon: '📈', label: 'Analytics'  },
  { to: '/admin/reports',    icon: '📄', label: 'Reports'    },
  { to: '/admin/alerts',     icon: '🚨', label: 'Alerts'     },
  { to: '/admin/settings',   icon: '⚙️',  label: 'Settings'  },
];

export default function AdminLayout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} flex-shrink-0 bg-gradient-to-b from-purple-900 to-indigo-900 text-white flex flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-purple-700/50">
          <div className="bg-purple-500 rounded-lg p-1.5 flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          {sidebarOpen && <span className="ml-3 font-black text-base truncate">HealthConnect</span>}
        </div>

        {/* Role badge */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-b border-purple-700/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <span className="text-xs bg-purple-500/60 text-purple-200 px-1.5 py-0.5 rounded-full">Admin</span>
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
                ${isActive
                  ? 'bg-white/20 text-white shadow-inner'
                  : 'text-purple-200 hover:bg-white/10 hover:text-white'}`
              }
            >
              <span className="text-lg flex-shrink-0">{icon}</span>
              {sidebarOpen && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-purple-700/50">
          <button
            onClick={() => { logout(); navigate('/'); }}
            className={`flex items-center gap-2 text-purple-300 hover:text-red-300 text-sm font-medium transition w-full ${sidebarOpen ? '' : 'justify-center'}`}
          >
            <span className="text-lg flex-shrink-0">🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
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
          <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
            🛡️ Admin Portal
          </span>
        </header>

        {/* Page content scrollable */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
