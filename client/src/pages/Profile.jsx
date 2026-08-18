import { useState } from 'react';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { changePassword as apiChangePassword } from '../services/auth';

const COLORS = ['#14B8A6', '#F59E0B', '#6366F1', '#EC4899', '#10B981', '#3B82F6', '#F43F5E'];

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [avatarColor, setAvatarColor] = useState(user.avatarColor);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    try {
      await updateProfile({ name, avatarColor });
      setProfileMsg('Profile updated.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwMsg('');
    setSavingPw(true);
    try {
      await apiChangePassword(pwForm);
      setPwMsg('Password changed successfully.');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPwError(err.response?.data?.message || 'Could not change password.');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-8 font-display text-2xl font-bold text-ink">Your profile</h1>

        <form onSubmit={handleProfileSave} className="card mb-6 space-y-5 p-6">
          <div className="flex items-center gap-4">
            <Avatar user={{ name, avatarColor }} size="lg" />
            <div className="flex-1">
              <label className="label">Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Avatar color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  className={`h-7 w-7 rounded-full transition ${avatarColor === c ? 'ring-2 ring-ink ring-offset-2' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Choose color ${c}`}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input value={user.email} disabled className="input-field cursor-not-allowed opacity-60" />
          </div>
          {profileMsg && <p className="text-sm font-medium text-teal-600">{profileMsg}</p>}
          <button type="submit" disabled={savingProfile} className="btn-primary">
            {savingProfile ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        <form onSubmit={handlePasswordSave} className="card space-y-4 p-6">
          <h2 className="font-display text-base font-semibold text-ink">Change password</h2>
          {pwError && <p className="rounded-lg bg-coral-500/10 px-3 py-2 text-sm text-coral-500">{pwError}</p>}
          {pwMsg && <p className="text-sm font-medium text-teal-600">{pwMsg}</p>}
          <div>
            <label className="label">Current password</label>
            <input
              type="password"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              minLength={6}
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
              className="input-field"
            />
          </div>
          <button type="submit" disabled={savingPw} className="btn-secondary">
            {savingPw ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </main>
    </div>
  );
}
