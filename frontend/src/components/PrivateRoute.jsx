import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useContext(AuthContext);
    const location = useLocation();

    // Show loading spinner while auth state is being checked
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    // Not logged in → go to login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Logged in but wrong role → send to their correct dashboard
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        if (user.role === 'admin') return <Navigate to="/admin-dashboard" replace />;
        if (user.role === 'doctor') return <Navigate to="/doctor-dashboard" replace />;
        return <Navigate to="/patient-dashboard" replace />;
    }

    return children;
};

export default PrivateRoute;
