interface LicenseStats {
  total: number
  active: number
  revoked: number
}

async function fetchStats(): Promise<LicenseStats> {
  const url = process.env.LICENSE_SERVER_URL || 'http://localhost:3001'
  const token = process.env.ADMIN_TOKEN || ''
  try {
    const res = await fetch(`${url}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return { total: 0, active: 0, revoked: 0 }
    return await res.json()
  } catch {
    return { total: 0, active: 0, revoked: 0 }
  }
}

export default async function AdminPage() {
  const stats = await fetchStats()

  const cardStyle: React.CSSProperties = {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    padding: '24px',
    flex: 1,
    minWidth: '200px',
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '24px' }}>Dashboard</h1>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <div style={cardStyle}>
          <p style={{ color: '#888', fontSize: '0.8125rem', marginBottom: '8px' }}>Total Licenses</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#c9a96e' }}>{stats.total}</p>
        </div>
        <div style={cardStyle}>
          <p style={{ color: '#888', fontSize: '0.8125rem', marginBottom: '8px' }}>Active</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#6ec9a9' }}>{stats.active}</p>
        </div>
        <div style={cardStyle}>
          <p style={{ color: '#888', fontSize: '0.8125rem', marginBottom: '8px' }}>Revoked</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#e07070' }}>{stats.revoked}</p>
        </div>
      </div>

      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '24px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a
            href="/licenses"
            style={{
              background: '#c9a96e', border: 'none', borderRadius: '8px',
              color: '#0f0f0f', display: 'inline-flex', alignItems: 'center',
              fontSize: '0.9375rem', fontWeight: 600, minHeight: '44px',
              padding: '0 24px', textDecoration: 'none',
            }}
          >
            View All Licenses
          </a>
        </div>
      </div>
    </div>
  )
}
