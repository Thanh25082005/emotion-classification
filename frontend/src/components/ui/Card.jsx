// Glass card dung chung. Bo goc 'card' (16px) nhat quan.
export default function Card({ className = '', children, ...props }) {
  return (
    <div className={`glass rounded-card ${className}`} {...props}>
      {children}
    </div>
  )
}
