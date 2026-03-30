import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const SPECIALTIES = ['All', 'Cardiology', 'Dermatology', 'Pediatrics', 'Orthopedics', 'Neurology', 'General Practice', 'Psychiatry'];

const StarRating = ({ rating }) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return (
        <div className="flex items-center space-x-0.5">
            {[...Array(5)].map((_, i) => (
                <svg key={i} className={`w-3.5 h-3.5 ${i < full ? 'text-yellow-400' : i === full && half ? 'text-yellow-300' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
            <span className="text-xs text-gray-500 ml-1">{rating.toFixed(1)}</span>
        </div>
    );
};

const BookingModal = ({ doctor, onClose, onConfirm, loading }) => {
    const [date, setDate] = useState('');
    const [timeSlot, setTimeSlot] = useState('');
    const [reason, setReason] = useState('');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!date || !reason.trim()) return;
        onConfirm({ doctorId: doctor._id, date, timeSlot, reason });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-5 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-black text-lg">
                            {doctor.name?.[3]?.toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">{doctor.name}</h3>
                            <p className="text-sm text-gray-500">{doctor.specialization}</p>
                        </div>
                    </div>
                </div>

                {/* Payment preview */}
                <div className="mx-5 mt-4 p-3 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center text-green-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-semibold">Mock Payment - Instant Confirmation</span>
                    </div>
                    <span className="font-black text-green-700 text-lg">${doctor.consultationFee}</span>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Appointment Date *</label>
                        <input
                            type="date"
                            required
                            min={minDate}
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-gray-900"
                        />
                    </div>

                    {doctor.availableSlots?.length > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Time Slot</label>
                            <div className="grid grid-cols-2 gap-2">
                                {doctor.availableSlots.map(slot => (
                                    <button
                                        key={slot}
                                        type="button"
                                        onClick={() => setTimeSlot(slot)}
                                        className={`py-2 px-3 text-sm rounded-lg border-2 transition-all ${timeSlot === slot ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reason for Visit *</label>
                        <textarea
                            required
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Briefly describe your symptoms or reason for visiting..."
                            rows={3}
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-gray-900 resize-none placeholder-gray-400"
                        />
                    </div>

                    <div className="flex space-x-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !date || !reason.trim()}
                            className="flex-1 py-3 rounded-xl text-white font-bold disabled:opacity-50 transition-all"
                            style={{ background: 'linear-gradient(135deg, #2563eb, #0ea5e9)' }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin h-4 w-4 mr-2 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    Booking...
                                </span>
                            ) : `Confirm & Pay $${doctor.consultationFee}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Appointment = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const { data } = await api.get('/doctors');
                setDoctors(data.data || []);
            } catch (err) {
                setError('Failed to load doctors. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchDoctors();
    }, []);

    const handleBook = async ({ doctorId, date, timeSlot, reason }) => {
        setBooking(true);
        setError('');
        try {
            await api.post('/appointments', { doctor: doctorId, date, timeSlot, reason });
            setSuccess(`Appointment booked! Payment of $${selectedDoctor.consultationFee} processed successfully.`);
            setSelectedDoctor(null);
            setTimeout(() => navigate('/patient-dashboard'), 2500);
        } catch (err) {
            setError(err.response?.data?.message || 'Booking failed. Please try again.');
        } finally {
            setBooking(false);
        }
    };

    const filtered = doctors.filter(d => {
        const matchSpec = filter === 'All' || d.specialization === filter;
        const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
            d.specialization.toLowerCase().includes(search.toLowerCase());
        return matchSpec && matchSearch;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            {selectedDoctor && (
                <BookingModal
                    doctor={selectedDoctor}
                    onClose={() => setSelectedDoctor(null)}
                    onConfirm={handleBook}
                    loading={booking}
                />
            )}

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #0ea5e9 100%)' }} className="text-white py-12 px-4">
                <div className="max-w-6xl mx-auto">
                    <button onClick={() => navigate(-1)} className="flex items-center text-blue-200 hover:text-white mb-4 text-sm">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                    <h1 className="text-3xl font-black mb-2">Find a Doctor</h1>
                    <p className="text-blue-100">Book an appointment with top specialists</p>

                    {/* Search Bar */}
                    <div className="mt-6 relative max-w-lg">
                        <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by name or specialty..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white bg-opacity-20 backdrop-blur border border-white border-opacity-30 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:border-white"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Alerts */}
                {success && (
                    <div className="mb-6 flex items-center bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl">
                        <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        {success}
                    </div>
                )}
                {error && (
                    <div className="mb-6 flex items-center bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        {error}
                    </div>
                )}

                {/* Specialty filters */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {SPECIALTIES.map(s => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${filter === s ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 bg-white'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {/* Doctor Cards */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                                <div className="flex space-x-4 mb-4">
                                    <div className="w-14 h-14 bg-gray-200 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                                    </div>
                                </div>
                                <div className="h-3 bg-gray-200 rounded mb-2" />
                                <div className="h-3 bg-gray-200 rounded w-2/3" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-4">🔍</div>
                        <h3 className="text-lg font-bold text-gray-700 mb-1">No doctors found</h3>
                        <p className="text-gray-400">Try searching with different keywords or filters</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(doctor => (
                            <div key={doctor._id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100">
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-black text-xl shrink-0">
                                                {doctor.name?.split(' ').slice(-1)[0]?.[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-sm leading-tight">{doctor.name}</h3>
                                                <p className="text-blue-600 text-xs font-semibold">{doctor.specialization}</p>
                                                <div className="mt-1">
                                                    <StarRating rating={doctor.rating || 4.5} />
                                                </div>
                                            </div>
                                        </div>
                                        {doctor.isAvailableToday && (
                                            <span className="flex items-center text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse" />
                                                Today
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">{doctor.bio}</p>

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                                            <p className="text-xs text-gray-400">Experience</p>
                                            <p className="font-bold text-gray-800 text-sm">{doctor.experience} yrs</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                                            <p className="text-xs text-gray-400">Reviews</p>
                                            <p className="font-bold text-gray-800 text-sm">{doctor.reviewCount || 0}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-400">Consultation Fee</p>
                                            <p className="text-xl font-black text-blue-600">${doctor.consultationFee}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedDoctor(doctor)}
                                            className="px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90"
                                            style={{ background: 'linear-gradient(135deg, #2563eb, #0ea5e9)' }}
                                        >
                                            Book Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Appointment;
