import WebcamView from '../components/WebcamView'

// Trang realtime. Phase 3: chua can login (token = undefined).
export default function Live() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}>
      <h1 style={{ textAlign: 'center' }}>Nhan dien cam xuc realtime</h1>
      <p style={{ textAlign: 'center', color: '#666' }}>
        Cho phep truy cap webcam de bat dau. Khuon mat se duoc khoanh kem nhan cam xuc.
      </p>
      <WebcamView />
    </div>
  )
}
