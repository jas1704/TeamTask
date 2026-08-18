import { Link } from 'react-router-dom';
import Avatar from './Avatar';

export default function ProjectCard({ project }) {
  const memberUsers = project.members.map((m) => m.user);

  return (
    <Link
      to={`/projects/${project._id}`}
      className="card group flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-panel"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-display text-base font-semibold text-ink group-hover:text-teal-700">
          {project.name}
        </h3>
        <span className="rounded-full bg-teal-50 px-2 py-0.5 font-mono text-[10px] font-medium text-teal-700">
          {project.members.length} {project.members.length === 1 ? 'member' : 'members'}
        </span>
      </div>
      <p className="line-clamp-2 flex-1 text-sm text-ink/55">
        {project.description || 'No description yet.'}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {memberUsers.slice(0, 4).map((u) => (
            <div key={u._id} className="ring-2 ring-white rounded-full">
              <Avatar user={u} size="sm" />
            </div>
          ))}
          {memberUsers.length > 4 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-ink/60 ring-2 ring-white">
              +{memberUsers.length - 4}
            </div>
          )}
        </div>
        <span className="text-xs font-mono text-ink/35">
          {new Date(project.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}
