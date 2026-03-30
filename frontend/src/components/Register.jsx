import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const SPECIALIZATIONS = ['Cardiology', 'Dermatology', 'Endocrinology', 'Gastroenterology', 'General Practice', 'Neurology', 'Oncology', 'Orthopedics', 'Pediatrics', 'Psychiatry', 'Pulmonology', 'Radiology', 'Urology'];

const Register = () => {
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'patient', phone: '',
        age: '', gender: 'Other', emergencyContactName: '', emergencyContactPhone: '',
        specialization: '', licenseId: '', verificationCode: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { registerPatient, registerDoctor, registerAdmin } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (formData.password.length < 6) {
            return setError('Password must be at least 6 characters.');
        }
        setLoading(true);
        try {
            if (formData.role === 'patient') {
                await registerPatient(formData);
                navigate('/patient-dashboard');
            } else if (formData.role === 'doctor') {
                await registerDoctor(formData);
                navigate('/doctor-dashboard');
            } else if (formData.role === 'admin') {
                await registerAdmin(formData);
                navigate('/admin-dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { value: 'patient', label: 'Patient', icon: '🧑‍⚕️', desc: 'Book appointments & track health' },
        { value: 'doctor', label: 'Doctor', icon: '👨‍⚕️', desc: 'Manage patients & appointments' },
        { value: 'admin', label: 'Admin', icon: '🛡️', desc: 'Manage the platform' },
    ];

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
                <h2 className="text-4xl font-bold text-center mb-4 leading-tight">Join thousands of <br />healthcare professionals</h2>
                <p className="text-blue-100 text-center text-lg max-w-sm">Start your healthcare journey today. Free to join, easy to use.</p>

                <div className="mt-12 space-y-4 w-full max-w-xs">
                    {[
                        ['✅', 'Secure & HIPAA compliant'],
                        ['📅', 'Easy appointment booking'],
                        ['🤖', 'AI-powered symptom checker'],
                        ['🔔', 'Real-time notifications'],
                    ].map(([icon, text]) => (
                        <div key={text} className="flex items-center space-x-3">
                            <span className="text-xl">{icon}</span>
                            <span className="text-blue-100">{text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white lg:rounded-l-3xl overflow-y-auto">
                <div className="w-full max-w-md py-8">
                    <div className="lg:hidden flex items-center justify-center mb-6">
                        <div className="bg-blue-600 rounded-xl p-2 mr-2">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <span className="text-2xl font-black text-gray-800">HealthConnect</span>
                    </div>

                    <h2 className="text-3xl font-black text-gray-900 mb-1">Create your account</h2>
                    <p className="text-gray-500 mb-6">Join HealthConnect for free</p>

                    {error && (
                        <div className="flex items-start bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">
                            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Role Selector */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">I am a...</label>
                            <div className="grid grid-cols-3 gap-3">
                                {roles.map(r => (
                                    <button
                                        key={r.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, role: r.value, specialization: '' })}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${formData.role === r.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <div className="text-xl mb-1">{r.icon}</div>
                                        <div className={`font-semibold text-sm ${formData.role === r.value ? 'text-blue-700' : 'text-gray-700'}`}>{r.label}</div>
                                        <div className="text-xs text-gray-400">{r.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="John Doe"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                            <input
                                type="tel"
                                name="phone"
                                required
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+1 234 567 8900"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        {formData.role === 'patient' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Age</label>
                                        <input
                                            type="number"
                                            name="age"
                                            required
                                            value={formData.age}
                                            onChange={handleChange}
                                            placeholder="30"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gender</label>
                                        <select
                                            name="gender"
                                            required
                                            value={formData.gender}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 transition-colors"
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Emergency Contact Name</label>
                                    <input
                                        type="text"
                                        name="emergencyContactName"
                                        required
                                        value={formData.emergencyContactName}
                                        onChange={handleChange}
                                        placeholder="Jane Doe"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Emergency Contact Phone</label>
                                    <input
                                        type="tel"
                                        name="emergencyContactPhone"
                                        required
                                        value={formData.emergencyContactPhone}
                                        onChange={handleChange}
                                        placeholder="+1 987 654 3210"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </>
                        )}

                        {formData.role === 'doctor' && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Specialization</label>
                                    <select
                                        name="specialization"
                                        required
                                        value={formData.specialization}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 transition-colors"
                                    >
                                        <option value="">Select your specialization</option>
                                        {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Medical License ID</label>
                                    <input
                                        type="text"
                                        name="licenseId"
                                        required
                                        value={formData.licenseId}
                                        onChange={handleChange}
                                        placeholder="MD-123456"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Verification Code
                                <span className="text-gray-400 font-normal text-xs ml-1">
                                    (provided by administrator)
                                </span>
                            </label>
                            <input
                                type="text"
                                name="verificationCode"
                                required
                                value={formData.verificationCode}
                                onChange={handleChange}
                                placeholder={
                                    formData.role === 'patient' ? 'e.g. PATIENT2025' :
                                        formData.role === 'doctor' ? 'e.g. DOCTOR2025' :
                                            'e.g. ADMIN2025'
                                }
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors font-mono tracking-widest uppercase"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password <span className="text-gray-400 font-normal text-xs">(min. 6 characters)</span></label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    required
                                    minLength={6}
                                    value={formData.password}
                                    onChange={handleChange}
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
                            className="w-full py-3.5 px-4 text-white font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                            style={{ background: loading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #0ea5e9)' }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    Creating account...
                                </span>
                            ) : 'Create Account'}
                        </button>
                    </form>

                    <p className="mt-5 text-center text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
