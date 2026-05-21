import { motion } from 'framer-motion'

const variants = {
  purple: 'bg-gradient-to-r from-[hsl(290,100%,65%)] to-[hsl(320,100%,60%)] text-white shadow-neon-purple hover:shadow-neon-purple',
  pink: 'bg-gradient-to-r from-[hsl(320,100%,60%)] to-[hsl(340,100%,65%)] text-white shadow-neon-pink',
  cyan: 'bg-gradient-to-r from-[hsl(185,100%,55%)] to-[hsl(210,100%,60%)] text-[#0a0a12] shadow-neon-cyan font-bold',
  ghost: 'bg-transparent border border-[rgba(255,255,255,0.2)] text-white hover:bg-[rgba(255,255,255,0.08)]',
  outline: 'bg-transparent border-2 border-[hsl(290,100%,65%)] text-[hsl(290,100%,65%)] hover:bg-[hsl(290,100%,65%,0.1)]',
  danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white',
  glass: 'bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)] text-white backdrop-blur-sm',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-base rounded-xl',
  lg: 'px-7 py-3.5 text-lg rounded-xl',
  xl: 'px-8 py-4 text-xl rounded-2xl',
}

export default function NeonButton({ variant = 'purple', size = 'md', className = '', children, disabled, onClick, type = 'button', fullWidth }) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: disabled ? 1 : 0.94 }}
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        transition-all duration-200 cursor-pointer select-none
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {children}
    </motion.button>
  )
}
