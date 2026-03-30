import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Home from './components/Home';
import Contact from './components/Contact';
import Login from './components/Login';
import Register from './components/Register';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import AdminDashboard from './components/AdminDashboard';
import Appointment from './components/Appointment';
import VideoCall from './components/VideoCall';
import MyStats from './components/MyStats';
import Notifications from './components/Notifications';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';

import './App.css';

// Layout with Navbar + Footer for public-facing pages
const PublicLayout = ({ children }) => (
  <div className="flex flex-col min-h-screen">
    <Navbar />
    <main className="flex-grow">
      {children}
    </main>
    <footer className="bg-gray-900 text-white pt-10 pb-6 mt-auto">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-black">HealthConnect</h3>
            </div>
            <p className="text-gray-400 text-sm">Your trusted partner in healthcare. Connecting you with expert doctors for better health outcomes.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-blue-400">Quick Links</h4>
            <ul className="space-y-1.5 text-gray-300 text-sm">
              <li><a href="/" className="hover:text-white transition">Home</a></li>
              <li><a href="/appointment" className="hover:text-white transition">Book Appointment</a></li>
              <li><a href="/contact" className="hover:text-white transition">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-blue-400">Contact</h4>
            <ul className="space-y-1.5 text-gray-300 text-sm">
              <li>📧 support@healthconnect.com</li>
              <li>📞 +1 (555) 123-4567</li>
              <li>📍 123 Healthcare Ave, NY 10001</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-5 text-center text-gray-500 text-sm">
          <p>© 2026 HealthConnect. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes with Navbar + Footer */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />

          {/* Auth routes - no layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Role-specific dashboards - NO PublicLayout (they have their own nav) */}
          <Route path="/patient-dashboard" element={
            <PrivateRoute allowedRoles={['patient']}>
              <PatientDashboard />
            </PrivateRoute>
          } />
          <Route path="/doctor-dashboard" element={
            <PrivateRoute allowedRoles={['doctor']}>
              <DoctorDashboard />
            </PrivateRoute>
          } />
          <Route path="/admin-dashboard" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          } />

          {/* Feature routes - NO PublicLayout (Appointment has its own header) */}
          <Route path="/appointment" element={
            <PrivateRoute allowedRoles={['patient', 'admin']}>
              <Appointment />
            </PrivateRoute>
          } />
          <Route path="/videocall" element={
            <PrivateRoute>
              <VideoCall />
            </PrivateRoute>
          } />
          <Route path="/mystats" element={
            <PrivateRoute allowedRoles={['patient']}>
              <MyStats />
            </PrivateRoute>
          } />
          <Route path="/notifications" element={
            <PrivateRoute>
              <Notifications />
            </PrivateRoute>
          } />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
