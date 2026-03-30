import { useState, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const navItems = [
    { id: '/', label: 'Home' },
    { id: '/appointment', label: 'Book Appointment' },
    { id: '/contact', label: 'Contact Us' }
  ];

  if (user?.role === 'patient') {
    navItems.splice(2, 0, { id: '/mystats', label: 'My Stats' });
  }

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const dashboardRoute = user?.role === 'admin'
    ? '/admin-dashboard'
    : user?.role === 'doctor' ? '/doctor-dashboard'
      : '/patient-dashboard';

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <div className="navbar-brand">
            <div className="logo">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="10" fill="url(#logo-gradient)" />
                <path d="M20 10L20 30M10 20L30 20" stroke="white" strokeWidth="3" strokeLinecap="round" />
                <defs>
                  <linearGradient id="logo-gradient" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="brand-name">HealthConnect</span>
          </div>

          <div className={`navbar-menu ${isMobileMenuOpen ? 'active' : ''}`}>
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.id}
                className={`nav-link ${location.pathname === item.id ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                {item.label}
              </Link>
            ))}

            {user ? (
              <div className="flex items-center space-x-4 ml-4 rtl-menu">
                <Link to="/notifications" className="text-gray-600 hover:text-blue-600 relative ml-4" onClick={handleNavClick}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </Link>
                <Link to={dashboardRoute} className="btn btn-outline ml-4" onClick={handleNavClick}>
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="text-red-500 hover:text-red-700 ml-4">
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4 ml-4 rtl-menu">
                <Link to="/login" className="nav-link font-medium" onClick={handleNavClick}>Login</Link>
                <Link to="/register" className="btn btn-primary" onClick={handleNavClick}>Sign Up</Link>
              </div>
            )}
          </div>

          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
