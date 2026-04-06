import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import styles from './CaseListScreen.module.css'

interface CaseSummary {
  id: string
  title: string
  madhab: string
  updatedAt: string
}

export function CaseListScreen() {
  const { _ } = useLingui()
  const navigate = useNavigate()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleOpenCase() {
    try {
      const data = await invoke<string>('open_mirath_file')
      if (data) {
        const parsed = JSON.parse(data)
        if (parsed.inheritanceCase) {
          const ic = parsed.inheritanceCase
          const summary: CaseSummary = {
            id: ic.id,
            title: ic.title || ic.deceased?.name || 'Untitled',
            madhab: ic.madhab,
            updatedAt: ic.updatedAt || new Date().toISOString(),
          }
          setCases((prev) => {
            const exists = prev.find((c) => c.id === summary.id)
            return exists ? prev : [...prev, summary]
          })
        }
      }
    } catch (err) {
      if (String(err).includes('cancel')) return
      setError(String(err))
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{_('Inheritance Calculator')}</h1>
        <div className={styles.actions}>
          <button className={styles.button} onClick={() => navigate('/case/new')}>
            {_('New Case')}
          </button>
          <button className={styles.buttonSecondary} onClick={handleOpenCase}>
            {_('Open Case')}
          </button>
        </div>
      </header>
      <main className={styles.main}>
        {error && (
          <p style={{ color: '#e07070', fontSize: '0.875rem', marginBottom: '16px' }}>{error}</p>
        )}
        {cases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ color: 'var(--color-muted)', fontSize: '1.125rem', marginBottom: '8px' }}>
              {_('New Case')}
            </p>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
              Create a new case or open an existing .mirath file
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cases.map((c) => (
              <div
                key={c.id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/case/${c.id}`)}
              >
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{c.title}</span>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', marginLeft: '12px' }}>
                    {c.madhab}
                  </span>
                </div>
                <span style={{ color: 'var(--color-muted)', fontSize: '0.8125rem' }}>
                  {new Date(c.updatedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
