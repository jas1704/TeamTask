export default function EmptyState({ icon = '◇', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl2 border border-dashed border-line bg-white/60 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-2xl text-teal-600">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink/50">{description}</p>}
      {action}
    </div>
  );
}
