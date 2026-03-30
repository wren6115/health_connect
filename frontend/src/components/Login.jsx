import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('patient');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(email, password, role);
            if (user.role === 'admin') navigate('/admin-dashboard');
            else if (user.role === 'doctor') navigate('/doctor-dashboard');
            else navigate('/patient-dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #0ea5e9 100%)' }}>
            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 text-white">
                <div className="flex items-center space-x-3 mb-8">
                    <div className="bg-white bg-opacity-20 rounded-xl p-3">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black">HealthConnect</h1>
                </div>
                <h2 className="text-4xl font-bold text-center mb-4 leading-tight">Your Health, <br />Connected.</h2>
                <p className="text-blue-100 text-center text-lg max-w-sm">Access top doctors, book appointments, and manage your health — all in one place.</p>

                <div className="mt-12 grid grid-cols-3 gap-6 text-center">
                    {[['500+', 'Doctors'], ['10K+', 'Patients'], ['99%', 'Satisfaction']].map(([val, label]) => (
                        <div key={label} className="bg-white bg-opacity-10 rounded-2xl p-4">
                            <div className="text-2xl font-black">{val}</div>
                            <div className="text-blue-200 text-sm">{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white lg:rounded-l-3xl">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center justify-center mb-8">
                        <div className="bg-blue-600 rounded-xl p-2 mr-2">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <span className="text-2xl font-black text-gray-800">HealthConnect</span>
                    </div>

                    <h2 className="text-3xl font-black text-gray-900 mb-1">Welcome back</h2>
                    <p className="text-gray-500 mb-8">Sign in to your account to continue</p>

                    {error && (
                        <div className="flex items-start bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
                            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">I am a</label>
                            <div className="flex gap-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="role"
                                        value="patient"
                                        checked={role === 'patient'}
                                        onChange={() => setRole('patient')}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-gray-700">Patient</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="role"
                                        value="doctor"
                                        checked={role === 'doctor'}
                                        onChange={() => setRole('doctor')}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-gray-700">Doctor</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="role"
                                        value="admin"
                                        checked={role === 'admin'}
                                        onChange={() => setRole('admin')}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-gray-700">Admin</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors pr-12"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {showPassword
                                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                                        }
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 px-4 text-white font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{ background: loading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #0ea5e9)' }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-500">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">Create one now</Link>
                    </p>

                    <p className="mt-8 text-center text-xs text-gray-400">
                        By signing in, you agree to our Terms & Privacy Policy
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
