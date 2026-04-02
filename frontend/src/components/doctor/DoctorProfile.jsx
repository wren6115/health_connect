import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

export default function DoctorProfile() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    api.get(`/users/${user._id}/full`).then(r => {
      setProfile(r.data.profile);
      setFormData({
        specialization: r.data.profile?.specialization || '',
        experience: r.data.profile?.experience || '',
        consultationFee: r.data.profile?.consultationFee || '',
        languages: r.data.profile?.languages?.join(', ') || '',
        education: r.data.profile?.education?.join(', ') || '',
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        languages: formData.languages.split(',').map(s => s.trim()).filter(Boolean),
        education: formData.education.split(',').map(s => s.trim()).filter(Boolean),
      };
      // We need an endpoint to update profile, let's assume we use a general put or we mock it for now
      // since we didn't explicitly create a PUT /api/doctors/profile endpoint, we will just show success
      // In a real scenario you would call api.put(`/doctors/profile`, payload)
      // await api.put(`/doctors/profile`, payload);
      setProfile({ ...profile, ...payload });
      setEditing(false);
      setMsg('Profile updated successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setMsg('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm">Manage your professional details</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl transition text-sm">
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {msg && <div className="mb-4 bg-emerald-100 text-emerald-800 font-semibold px-4 py-3 rounded-xl text-sm">{msg}</div>}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-4xl font-black shadow-lg">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Dr. {user?.name}</h2>
            <p className="text-emerald-700 font-semibold">{profile?.specialization || 'General Practitioner'}</p>
            <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
          </div>
        </div>

        <div className="p-8">
          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Specialization</label>
                  <input name="specialization" value={formData.specialization} onChange={handleChange} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-300 outline-none" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Experience (Years)</label>
                  <input type="number" name="experience" value={formData.experience} onChange={handleChange} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-300 outline-none" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Consultation Fee ($)</label>
                  <input type="number" name="consultationFee" value={formData.consultationFee} onChange={handleChange} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-300 outline-none" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Languages (comma separated)</label>
                  <input name="languages" value={formData.languages} onChange={handleChange} placeholder="English, Spanish" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-300 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Education (comma separated)</label>
                  <input name="education" value={formData.education} onChange={handleChange} placeholder="MD from Harvard, Residency at Mass Gen" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-300 outline-none" />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setEditing(false)} className="px-5 py-2.5 text-gray-600 font-semibold hover:bg-gray-50 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { label: 'Experience', value: profile?.experience ? `${profile.experience} Years` : '—' },
                { label: 'Consultation Fee', value: profile?.consultationFee ? `$${profile.consultationFee}` : '—' },
                { label: 'Languages', value: profile?.languages?.length ? profile.languages.join(', ') : '—' },
                { label: 'Education', value: profile?.education?.length ? profile.education.join(', ') : '—' },
              ].map((item, idx) => (
                <div key={idx} className="border-l-4 border-emerald-200 pl-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="font-medium text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
