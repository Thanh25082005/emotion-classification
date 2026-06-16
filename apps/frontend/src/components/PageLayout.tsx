import NavBar from './NavBar'

interface Props {
  children: React.ReactNode
  title?: string
}

export default function PageLayout({ children, title }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {title && <h1 className="text-2xl font-semibold text-gray-900 mb-6">{title}</h1>}
        {children}
      </main>
    </div>
  )
}
