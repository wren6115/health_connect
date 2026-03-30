import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkLoggedIn = () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decoded = jwtDecode(token);

                    // Basic validation to see if token is expired
                    if (decoded.exp * 1000 < Date.now()) {
                        throw new Error('Token expired');
                    }

                    // We can restore basic user state from JWT immediately 
                    // To get full profile info, we'd make an API call, but we can store details on login
                    const savedUser = JSON.parse(localStorage.getItem('user'));
                    if (savedUser) {
                        setUser(savedUser);
                    } else {
                        // Fallback to minimal decoded info
                        setUser({ _id: decoded.id, role: decoded.role });
                    }
                } catch (error) {
                    console.error('Auth verification failed:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            }
            setLoading(false);
        };

        checkLoggedIn();
    }, []);

    const login = async (email, password, role) => {
        const { data } = await api.post('/auth/ext/login', { email, password, role });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        return data;
    };

    const registerPatient = async (userData) => {
        const { data } = await api.post('/auth/ext/register/patient', userData);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        return data;
    };

    const registerDoctor = async (userData) => {
        const { data } = await api.post('/auth/ext/register/doctor', userData);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        return data;
    };

    const registerAdmin = async (userData) => {
        const { data } = await api.post('/auth/ext/register/admin', userData);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        return data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, registerPatient, registerDoctor, registerAdmin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
