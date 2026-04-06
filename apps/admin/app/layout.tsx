export const metadata = {
  title: 'Mirath Admin',
  description: 'License management dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0, padding: 0,
        background: '#0f0f0f', color: '#e8e8e8',
        fontFamily: 'Inter, system-ui, sans-serif',
        minHeight: '100vh',
      }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 32px', borderBottom: '1px solid #2a2a2a',
        }}>
          <a href="/" style={{ fontSize: '1.125rem', fontWeight: 600, color: '#c9a96e', textDecoration: 'none' }}>
            Mirath Admin
          </a>
          <nav style={{ display: 'flex', gap: '16px' }}>
            <a href="/" style={{ color: '#888', textDecoration: 'none', fontSize: '0.875rem' }}>Dashboard</a>
            <a href="/licenses" style={{ color: '#888', textDecoration: 'none', fontSize: '0.875rem' }}>Licenses</a>
          </nav>
        </header>
        <main style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
