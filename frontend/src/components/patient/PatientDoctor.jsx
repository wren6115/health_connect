import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function PatientDoctor() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get(`/users/${user._id}/full`)
      .then(r => setProfile(r.data.profile))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const doctor = profile?.doctorId;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">My Doctor</h1>
        <p className="text-gray-500 text-sm">Information about your assigned healthcare provider</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading doctor details...</div>
      ) : !doctor ? (
        <div className="bg-orange-50 border-l-4 border-orange-500 rounded-r-2xl p-6 shadow-sm">
          <h3 className="font-bold text-orange-800 text-lg mb-2">No Doctor Assigned</h3>
          <p className="text-orange-700 text-sm mb-4">You are not currently assigned to a specific doctor. Please contact administration.</p>
          <button onClick={() => navigate('/contact')} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition">
            Contact Support
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50 flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-4xl font-black shadow-lg">
              {doctor.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Dr. {doctor.name}</h2>
              <p className="text-blue-700 font-semibold">{doctor.specialization || 'General Practitioner'}</p>
              <p className="text-gray-500 text-sm mt-1">{doctor.email}</p>
            </div>
          </div>
          <div className="p-8 flex flex-col sm:flex-row gap-4">
            <button onClick={() => navigate('/appointment')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow shadow-blue-200">
              📅 Book Appointment
            </button>
            <button onClick={() => navigate('/videocall')} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-xl transition shadow shadow-cyan-200">
              📹 Start Video Consult
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
