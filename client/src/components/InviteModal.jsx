import { useState } from 'react';
import Modal from './Modal';

const ROLES = [
  { value: 'co-owner', label: 'Co-owner' },
  { value: 'product-owner', label: 'Product Owner' },
  { value: 'contributor', label: 'Contributor' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

export default function InviteModal({ open, onClose, onInvite }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onInvite(email.trim(), role);
      setEmail('');
      setRole('member');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not invite this person.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite a teammate">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-ink/50">
          They'll need a TeamTask account already. Enter the email they registered with.
        </p>
        {error && <p className="rounded-lg bg-coral-500/10 px-3 py-2 text-sm text-coral-500">{error}</p>}
        <div>
          <label className="label">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="teammate@company.com"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field">
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink/40">You can change this later from the members list.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Inviting…' : 'Send invite'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
