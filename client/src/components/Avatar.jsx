export default function Avatar({ user, size = 'md', online }) {
  if (!user) return null;
  const sizes = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-11 w-11 text-sm' };
  const dotSizes = { sm: 'h-2 w-2', md: 'h-2.5 w-2.5', lg: 'h-3 w-3' };
  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative flex-shrink-0">
      <div
        className={`flex items-center justify-center rounded-full font-display font-semibold text-white transition-opacity ${sizes[size]} ${
          online === false ? 'opacity-40 grayscale' : ''
        }`}
        style={{ backgroundColor: user.avatarColor || '#14B8A6' }}
        title={user.name}
      >
        {initials}
      </div>
      {online !== undefined && (
        <span
          className={`absolute -right-0.5 -bottom-0.5 rounded-full ring-2 ring-white ${dotSizes[size]} ${
            online ? 'bg-teal-500' : 'bg-slate-300'
          }`}
          title={online ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}
