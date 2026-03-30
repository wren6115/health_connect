import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './VideoCall.css';

function VideoCall() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [isCallActive, setIsCallActive] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const [appointments, setAppointments] = useState([]);
    const [selectedAppt, setSelectedAppt] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const fetchApprovedAppointments = async () => {
            try {
                const { data } = await api.get('/appointments');
                const approved = data.filter(a => a.status === 'approved');
                setAppointments(approved);
                if (approved.length > 0) setSelectedAppt(approved[0]);
            } catch (err) {
                console.error("Failed to fetch appointments for video call", err);
            } finally {
                setLoading(false);
            }
        };

        fetchApprovedAppointments();
    }, [user, navigate]);

    const startCall = () => {
        if (!selectedAppt) {
            alert('Please select an appointment to join.');
            return;
        }
        setIsCallActive(true);
    };

    const endCall = () => {
        setIsCallActive(false);
        setIsMuted(false);
        setIsVideoOff(false);
        navigate(user?.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard');
    };

    return (
        <div className="videocall section-padding">
            <div className="container">
                {!isCallActive ? (
                    <div className="videocall-start">
                        <div className="section-header text-center mb-xl">
                            <h2 className="section-title">Video Consultation</h2>
                            <p className="section-subtitle">
                                Connect with your {user?.role === 'doctor' ? 'patient' : 'doctor'} through secure, high-quality video calls
                            </p>
                        </div>

                        {loading ? (
                            <div className="text-center">Loading appointments...</div>
                        ) : appointments.length > 0 ? (
                            <div className="max-w-md mx-auto mb-8 text-center bg-white p-6 rounded-lg shadow">
                                <h3 className="text-lg font-bold mb-4">Select Appointment to Join</h3>
                                <select
                                    className="w-full p-2 border border-gray-300 rounded mb-4"
                                    value={selectedAppt?._id}
                                    onChange={(e) => setSelectedAppt(appointments.find(a => a._id === e.target.value))}
                                >
                                    {appointments.map(apt => (
                                        <option key={apt._id} value={apt._id}>
                                            {new Date(apt.date).toLocaleString()} - {user?.role === 'doctor' ? `Patient: ${apt.patient?.name}` : `Dr. ${apt.doctor?.name}`}
                                        </option>
                                    ))}
                                </select>

                                <div className="start-call-section mt-4 border-t pt-4">
                                    <button className="btn btn-primary btn-start-call w-full justify-center" onClick={startCall}>
                                        Join Video Call
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="ml-2">
                                            <path d="M15 10L19.553 7.724C20.237 7.382 21 7.87 21 8.618V15.382C21 16.13 20.237 16.618 19.553 16.276L15 14M5 18H13C14.105 18 15 17.105 15 16V8C15 6.895 14.105 6 13 6H5C3.895 6 3 6.895 3 8V16C3 17.105 3.895 18 5 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-8 bg-white rounded-lg shadow">
                                <p className="text-gray-500 mb-4">You have no approved appointments to join.</p>
                                <button className="btn btn-primary" onClick={() => navigate(user?.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard')}>
                                    Return to Dashboard
                                </button>
                            </div>
                        )}

                        <div className="videocall-features mt-12">
                            <div className="feature-item">
                                <div className="feature-icon-large">🎥</div>
                                <h3>HD Video Quality</h3>
                                <p>Crystal clear video for accurate consultations</p>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon-large">🔒</div>
                                <h3>Secure & Private</h3>
                                <p>End-to-end encrypted video calls</p>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon-large">💬</div>
                                <h3>Screen Sharing</h3>
                                <p>Share medical reports and documents</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="videocall-active">
                        <div className="call-container">
                            <div className="video-grid">
                                <div className="video-main bg-gray-900 rounded-lg overflow-hidden relative">
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                                        <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center text-4xl mb-4">
                                            {user?.role === 'doctor' ? '👤' : '👨‍⚕️'}
                                        </div>
                                        <p className="text-xl font-bold">
                                            {user?.role === 'doctor' ? selectedAppt?.patient?.name : `Dr. ${selectedAppt?.doctor?.name}`}
                                        </p>
                                        <p className="text-gray-400 mt-2">Connected</p>
                                    </div>
                                </div>
                                <div className="video-self bg-gray-800 rounded-lg border-2 border-white absolute bottom-24 right-4 w-48 h-32 overflow-hidden shadow-lg">
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                                        {isVideoOff ? (
                                            <div className="text-2xl">📷 (Off)</div>
                                        ) : (
                                            <>
                                                <div className="text-2xl mb-1">👤</div>
                                                <p className="text-xs">You</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="call-controls">
                                <button
                                    className={`control-btn ${isMuted ? 'active' : ''}`}
                                    onClick={() => setIsMuted(!isMuted)}
                                    title={isMuted ? 'Unmute' : 'Mute'}
                                >
                                    {isMuted ? '🔇' : '🎤'}
                                </button>
                                <button
                                    className={`control-btn ${isVideoOff ? 'active' : ''}`}
                                    onClick={() => setIsVideoOff(!isVideoOff)}
                                    title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                                >
                                    {isVideoOff ? '📹' : '📷'}
                                </button>
                                <button className="control-btn" title="Share screen">
                                    🖥️
                                </button>
                                <button className="control-btn" title="Chat">
                                    💬
                                </button>
                                <button className="control-btn end-call-btn" onClick={endCall} title="End call">
                                    📞
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VideoCall;
