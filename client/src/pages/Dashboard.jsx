import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import ProjectCard from '../components/ProjectCard';
import EmptyState from '../components/EmptyState';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import { fetchProjects, createProject } from '../services/projects';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setProjects(await fetchProjects());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Give your project a name.');
    setSaving(true);
    setError('');
    try {
      const project = await createProject(form);
      setProjects((p) => [project, ...p]);
      setForm({ name: '', description: '' });
      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create the project.');
    } finally {
      setSaving(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink/40">{greeting}, {user?.name?.split(' ')[0]}</p>
            <h1 className="font-display text-2xl font-bold text-ink">Your projects</h1>
          </div>
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            + New project
          </button>
        </div>

        {loading ? (
          <Loader label="Loading your projects" />
        ) : projects.length === 0 ? (
          <EmptyState
            icon="◇"
            title="No projects yet"
            description="Create your first project to start assigning tasks and tracking deadlines with your team."
            action={
              <button onClick={() => setModalOpen(true)} className="btn-primary mt-2">
                Create a project
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p._id} project={p} />
            ))}
          </div>
        )}
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New project">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <p className="rounded-lg bg-coral-500/10 px-3 py-2 text-sm text-coral-500">{error}</p>}
          <div>
            <label className="label">Project name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input-field"
              placeholder="e.g. Website Redesign"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="input-field resize-none"
              placeholder="What's this project about?"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
