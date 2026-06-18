import Navbar from './Navbar'

// App shell cho cac trang da dang nhap: nen glow + navbar + vung noi dung.
export default function Layout({ children }) {
  return (
    <div className="bg-glows min-h-[100dvh]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
