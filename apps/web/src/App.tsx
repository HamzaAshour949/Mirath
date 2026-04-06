import { useState, useEffect, useCallback } from 'react'
import { I18nProvider } from '@lingui/react'
import { i18n, setupI18n, type Locale } from '@mirath/i18n'
import type { Deceased, Madhab, Heir, HeirRelation, Gender, InheritanceCase, CalculationResult } from '@mirath/core'
import { CaseForm, FamilyTreeCanvas, ShareSummaryTable, HeirCard, LanguageToggle } from '@mirath/ui'

const LICENSE_SERVER_URL = '/api' // proxied via vite or direct URL in production

type Step = 'license' | 'form' | 'heirs' | 'results'

const HEIR_RELATIONS: HeirRelation[] = [
  'husband', 'wife', 'son', 'daughter', 'son_of_son', 'daughter_of_son',
  'father', 'mother', 'paternal_grandfather', 'paternal_grandmother', 'maternal_grandmother',
  'full_brother', 'full_sister', 'paternal_half_brother', 'paternal_half_sister',
  'maternal_half_brother', 'maternal_half_sister',
  'son_of_full_brother', 'son_of_paternal_half_brother',
  'paternal_uncle', 'paternal_half_uncle', 'son_of_paternal_uncle', 'son_of_paternal_half_uncle',
]

const RELATION_GENDERS: Record<string, Gender> = {
  husband: 'male', wife: 'female', son: 'male', daughter: 'female',
  son_of_son: 'male', daughter_of_son: 'female',
  father: 'male', mother: 'female',
  paternal_grandfather: 'male', paternal_grandmother: 'female', maternal_grandmother: 'female',
  full_brother: 'male', full_sister: 'female',
  paternal_half_brother: 'male', paternal_half_sister: 'female',
  maternal_half_brother: 'male', maternal_half_sister: 'female',
  son_of_full_brother: 'male', son_of_paternal_half_brother: 'male',
  paternal_uncle: 'male', paternal_half_uncle: 'male',
  son_of_paternal_uncle: 'male', son_of_paternal_half_uncle: 'male',
}

function LicenseGate({ onActivated }: { onActivated: (token: string) => void }) {
  const [licenseKey, setLicenseKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleActivate() {
    if (!licenseKey.trim()) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${LICENSE_SERVER_URL}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseToken: licenseKey.trim(), email: '', fingerprint: {} }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Activation failed' }))
        throw new Error(data.error || 'Activation failed')
      }
      const data = await res.json()
      const token = data.licenseId || data.id || licenseKey.trim()
      localStorage.setItem('mirath_session', token)
      onActivated(token)
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', padding: '24px',
      background: '#0f0f0f', color: '#e8e8e8', fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px',
        padding: '40px', width: '100%', maxWidth: '480px',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#c9a96e' }}>Mirath</h1>
        <p style={{ fontSize: '0.875rem', color: '#888' }}>Enter your license key to access the app.</p>
        <input
          style={{
            background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '8px',
            color: '#e8e8e8', fontFamily: 'monospace', fontSize: '0.875rem',
            padding: '12px', width: '100%',
          }}
          value={licenseKey}
          onChange={(e) => setLicenseKey(e.target.value)}
          placeholder="License key..."
          onKeyDown={(e) => { if (e.key === 'Enter') handleActivate() }}
        />
        {error && <p style={{ color: '#e07070', fontSize: '0.875rem' }}>{error}</p>}
        <button
          onClick={handleActivate}
          disabled={loading || !licenseKey.trim()}
          style={{
            background: '#c9a96e', border: 'none', borderRadius: '8px',
            color: '#0f0f0f', cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 600,
            minHeight: '44px', padding: '0 24px', opacity: loading || !licenseKey.trim() ? 0.4 : 1,
          }}
        >
          {loading ? '...' : 'Activate'}
        </button>
      </div>
    </div>
  )
}

function MainApp({ sessionToken }: { sessionToken: string }) {
  const [locale, setLocale] = useState<Locale>('en')
  const [i18nReady, setI18nReady] = useState(false)
  const [step, setStep] = useState<Step>('form')
  const [deceased, setDeceased] = useState<Deceased | null>(null)
  const [madhab, setMadhab] = useState<Madhab>('hanafi')
  const [heirs, setHeirs] = useState<Heir[]>([])
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [newHeirName, setNewHeirName] = useState('')
  const [newHeirRelation, setNewHeirRelation] = useState<HeirRelation>('son')

  useEffect(() => {
    setupI18n(locale).then(() => setI18nReady(true))
  }, [locale])

  const handleFormSubmit = useCallback((dec: Deceased, m: Madhab) => {
    setDeceased(dec)
    setMadhab(m)
    setStep('heirs')
  }, [])

  function addHeir() {
    if (!newHeirName.trim()) return
    const heir: Heir = {
      id: crypto.randomUUID(),
      name: newHeirName.trim(),
      gender: RELATION_GENDERS[newHeirRelation] || 'male',
      relation: newHeirRelation,
      isAlive: true,
    }
    setHeirs([...heirs, heir])
    setNewHeirName('')
  }

  function removeHeir(id: string) {
    setHeirs(heirs.filter((h) => h.id !== id))
  }

  async function handleCalculate() {
    if (!deceased || heirs.length === 0) return
    setCalculating(true)
    try {
      const inheritanceCase: InheritanceCase = {
        id: crypto.randomUUID(),
        title: deceased.name,
        madhab,
        deceased,
        heirs,
        familyTree: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        appVersion: '0.0.1',
      }
      // Server-side calculation
      const res = await fetch(`${LICENSE_SERVER_URL}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(inheritanceCase),
      })
      if (!res.ok) throw new Error('Calculation failed')
      const calcResult: CalculationResult = await res.json()
      setResult(calcResult)
      setStep('results')
    } catch {
      // Fallback: if server-side calc isn't available, show an error
      setResult(null)
    } finally {
      setCalculating(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('mirath_session')
    window.location.reload()
  }

  const currentCase: InheritanceCase | null = deceased ? {
    id: 'current',
    title: deceased.name,
    madhab,
    deceased,
    heirs,
    familyTree: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    appVersion: '0.0.1',
  } : null

  if (!i18nReady) return null

  return (
    <I18nProvider i18n={i18n}>
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        background: '#0f0f0f', color: '#e8e8e8', fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 32px', borderBottom: '1px solid #2a2a2a', gap: '16px',
        }}>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#c9a96e', cursor: 'pointer' }}
              onClick={() => { setStep('form'); setResult(null) }}>
            Mirath
          </h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <LanguageToggle locale={locale} onChange={setLocale} />
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '8px',
                color: '#888', cursor: 'pointer', fontSize: '0.8125rem',
                minHeight: '44px', padding: '0 16px',
              }}
            >
              Logout
            </button>
          </div>
        </header>
        <main style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
          {step === 'form' && <CaseForm onSubmit={handleFormSubmit} locale={locale} />}
          {step === 'heirs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
              <button
                onClick={() => setStep('form')}
                style={{
                  background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '8px',
                  color: '#e8e8e8', cursor: 'pointer', fontSize: '0.9375rem',
                  minHeight: '44px', padding: '0 16px', alignSelf: 'flex-start',
                }}
              >
                ← Back
              </button>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ fontSize: '0.8125rem', color: '#888', display: 'block', marginBottom: '4px' }}>Name</label>
                  <input
                    style={{
                      background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '8px',
                      color: '#e8e8e8', fontSize: '0.9375rem', minHeight: '44px',
                      padding: '0 12px', width: '100%',
                    }}
                    value={newHeirName}
                    onChange={(e) => setNewHeirName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHeir() } }}
                  />
                </div>
                <div style={{ minWidth: '180px' }}>
                  <label style={{ fontSize: '0.8125rem', color: '#888', display: 'block', marginBottom: '4px' }}>Relation</label>
                  <select
                    style={{
                      background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '8px',
                      color: '#e8e8e8', fontSize: '0.9375rem', minHeight: '44px',
                      padding: '0 12px', width: '100%', appearance: 'auto',
                    }}
                    value={newHeirRelation}
                    onChange={(e) => setNewHeirRelation(e.target.value as HeirRelation)}
                  >
                    {HEIR_RELATIONS.map((r) => (
                      <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={addHeir}
                  disabled={!newHeirName.trim()}
                  style={{
                    background: '#c9a96e', border: 'none', borderRadius: '8px',
                    color: '#0f0f0f', cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 600,
                    minHeight: '44px', padding: '0 20px', opacity: newHeirName.trim() ? 1 : 0.4,
                  }}
                >
                  + Add
                </button>
              </div>
              {currentCase && heirs.length > 0 && (
                <FamilyTreeCanvas inheritanceCase={currentCase} readOnly />
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {heirs.map((heir) => (
                  <div key={heir.id} style={{ position: 'relative' }}>
                    <HeirCard heir={heir} />
                    <button
                      onClick={() => removeHeir(heir.id)}
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'transparent', border: 'none', color: '#e07070',
                        cursor: 'pointer', fontSize: '1rem',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {heirs.length > 0 && (
                <button
                  onClick={handleCalculate}
                  disabled={calculating}
                  style={{
                    background: '#c9a96e', border: 'none', borderRadius: '8px',
                    color: '#0f0f0f', cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 600,
                    minHeight: '44px', padding: '0 24px', alignSelf: 'flex-start',
                    opacity: calculating ? 0.4 : 1,
                  }}
                >
                  {calculating ? 'Calculating...' : 'Calculate'}
                </button>
              )}
            </div>
          )}
          {step === 'results' && result && currentCase && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
              <button
                onClick={() => setStep('heirs')}
                style={{
                  background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '8px',
                  color: '#e8e8e8', cursor: 'pointer', fontSize: '0.9375rem',
                  minHeight: '44px', padding: '0 16px', alignSelf: 'flex-start',
                }}
              >
                ← Back
              </button>
              <FamilyTreeCanvas inheritanceCase={currentCase} readOnly />
              <ShareSummaryTable result={result} inheritanceCase={currentCase} locale={locale} />
            </div>
          )}
        </main>
      </div>
    </I18nProvider>
  )
}

export function App() {
  const [sessionToken, setSessionToken] = useState<string | null>(() =>
    localStorage.getItem('mirath_session')
  )

  if (!sessionToken) {
    return <LicenseGate onActivated={setSessionToken} />
  }

  return <MainApp sessionToken={sessionToken} />
}
