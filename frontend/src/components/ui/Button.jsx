// Button dung chung. variant: 'primary' | 'secondary' | 'ghost'. Bo goc pill nhat quan.
const VARIANTS = {
  primary:
    'bg-gradient-to-r from-brand-500 to-sad text-white shadow-lg shadow-brand-500/25 hover:brightness-110',
  secondary:
    'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15 backdrop-blur',
  ghost: 'text-slate-300 hover:bg-white/5 hover:text-white',
}

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold
        transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
