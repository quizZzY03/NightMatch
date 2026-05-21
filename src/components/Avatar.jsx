export default function Avatar({ src, name, size = 'md', className = '', online }) {
  const sizes = { xs: 'w-8 h-8 text-xs', sm: 'w-10 h-10 text-sm', md: 'w-14 h-14 text-base', lg: 'w-20 h-20 text-xl', xl: 'w-28 h-28 text-3xl', '2xl': 'w-36 h-36 text-4xl' }
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div className={`${sizes[size]} rounded-full overflow-hidden border-2 border-[hsl(290,100%,65%,0.4)] ring-2 ring-[hsl(320,100%,60%,0.2)]`}
        style={{ boxShadow: '0 0 16px hsl(290,100%,65%,0.3)' }}>
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
        ) : null}
        <div className={`w-full h-full flex items-center justify-center font-bold text-white gradient-purple-pink ${src ? 'hidden' : 'flex'}`}>
          {initials}
        </div>
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0a0a12]" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.8)' }} />
      )}
    </div>
  )
}
