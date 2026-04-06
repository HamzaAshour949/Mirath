interface License {
  id: string
  email: string
  fingerprint_hash: string
  issued_at: string
  revoked_at: string | null
  purchase_ref: string
  purchase_method: string
}

async function fetchLicenses(): Promise<License[]> {
  const url = process.env.LICENSE_SERVER_URL || 'http://localhost:3001'
  const token = process.env.ADMIN_TOKEN || ''
  try {
    const res = await fetch(`${url}/admin/licenses`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export default async function LicensesPage() {
  const licenses = await fetchLicenses()

  const thStyle: React.CSSProperties = {
    fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.05em', color: '#888', padding: '12px 16px',
    textAlign: 'left', borderBottom: '1px solid #2a2a2a',
  }

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px', fontSize: '0.875rem',
    borderBottom: '1px solid #2a2a2a', color: '#e8e8e8',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Licenses</h1>
        <span style={{ color: '#888', fontSize: '0.875rem' }}>{licenses.length} total</span>
      </div>

      {licenses.length === 0 ? (
        <div style={{
          background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px',
          padding: '48px', textAlign: 'center',
        }}>
          <p style={{ color: '#888' }}>No licenses found. Make sure LICENSE_SERVER_URL and ADMIN_TOKEN are configured.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden',
          }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Issued</th>
                <th style={thStyle}>Method</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((license) => (
                <tr key={license.id}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {license.id.slice(0, 8)}…
                  </td>
                  <td style={tdStyle}>{license.email || '—'}</td>
                  <td style={{ ...tdStyle, color: '#888', fontSize: '0.8125rem' }}>
                    {new Date(license.issued_at).toLocaleDateString()}
                  </td>
                  <td style={tdStyle}>{license.purchase_method || '—'}</td>
                  <td style={tdStyle}>
                    {license.revoked_at ? (
                      <span style={{ color: '#e07070', fontWeight: 600, fontSize: '0.8125rem' }}>Revoked</span>
                    ) : (
                      <span style={{ color: '#6ec9a9', fontWeight: 600, fontSize: '0.8125rem' }}>Active</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {!license.revoked_at && (
                      <RevokeButton licenseId={license.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function RevokeButton({ licenseId }: { licenseId: string }) {
  return (
    <form
      action={async () => {
        'use server'
        const url = process.env.LICENSE_SERVER_URL || 'http://localhost:3001'
        const token = process.env.ADMIN_TOKEN || ''
        await fetch(`${url}/admin/revoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ licenseId }),
        })
      }}
    >
      <button
        type="submit"
        style={{
          background: 'transparent', border: '1px solid #e07070',
          borderRadius: '8px', color: '#e07070', cursor: 'pointer',
          fontSize: '0.8125rem', minHeight: '36px', padding: '0 16px',
        }}
      >
        Revoke
      </button>
    </form>
  )
}
