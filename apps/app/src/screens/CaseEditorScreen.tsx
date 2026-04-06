import { useState, useCallback } from 'react'
import { useLingui } from '@lingui/react'
import { useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import type { Deceased, Madhab, Heir, HeirRelation, Gender, InheritanceCase, CalculationResult } from '@mirath/core'
import { calculate } from '@mirath/core'
import { CaseForm, FamilyTreeCanvas, ShareSummaryTable, HeirCard } from '@mirath/ui'
import styles from './CaseEditorScreen.module.css'

type Step = 'form' | 'heirs' | 'results'

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

export function CaseEditorScreen() {
  const { _ } = useLingui()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('form')
  const [deceased, setDeceased] = useState<Deceased | null>(null)
  const [madhab, setMadhab] = useState<Madhab>('hanafi')
  const [heirs, setHeirs] = useState<Heir[]>([])
  const [result, setResult] = useState<CalculationResult | null>(null)

  // Heir add form state
  const [newHeirName, setNewHeirName] = useState('')
  const [newHeirRelation, setNewHeirRelation] = useState<HeirRelation>('son')

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

  function handleCalculate() {
    if (!deceased || heirs.length === 0) return
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
    const calcResult = calculate(inheritanceCase)
    setResult(calcResult)
    setStep('results')
  }

  async function handleSave() {
    if (!deceased) return
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
    try {
      await invoke('save_mirath_file', {
        caseData: JSON.stringify({ inheritanceCase, result, savedAt: new Date().toISOString(), appVersion: '0.0.1' }),
      })
    } catch {
      // dialog may have been cancelled
    }
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => step === 'form' ? navigate('/') : setStep(step === 'results' ? 'heirs' : 'form')}>←</button>
        <h1 className={styles.title}>
          {step === 'form' ? _('Deceased') : step === 'heirs' ? _('Heirs') : _('Results')}
        </h1>
        <div className={styles.actions}>
          {step === 'heirs' && (
            <button className={styles.button} onClick={handleCalculate} disabled={heirs.length === 0}>
              {_('Calculate')}
            </button>
          )}
          {step === 'results' && (
            <button className={styles.buttonSecondary} onClick={handleSave}>
              {_('Save Case')}
            </button>
          )}
        </div>
      </header>
      <main className={styles.main}>
        {step === 'form' && (
          <CaseForm onSubmit={handleFormSubmit} locale="en" />
        )}

        {step === 'heirs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Add heir form */}
            <div style={{
              display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', display: 'block', marginBottom: '4px' }}>
                  {_('Name')}
                </label>
                <input
                  style={{
                    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)', color: 'var(--color-text)',
                    fontSize: '0.9375rem', minHeight: 'var(--touch-target)', padding: '0 12px', width: '100%',
                  }}
                  value={newHeirName}
                  onChange={(e) => setNewHeirName(e.target.value)}
                  placeholder={_('Name')}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHeir() } }}
                />
              </div>
              <div style={{ minWidth: '180px' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', display: 'block', marginBottom: '4px' }}>
                  Relation
                </label>
                <select
                  style={{
                    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)', color: 'var(--color-text)',
                    fontSize: '0.9375rem', minHeight: 'var(--touch-target)', padding: '0 12px',
                    width: '100%', appearance: 'auto',
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
                  background: 'var(--color-accent)', border: 'none', borderRadius: 'var(--radius)',
                  color: '#0f0f0f', cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 600,
                  minHeight: 'var(--touch-target)', padding: '0 20px',
                  opacity: newHeirName.trim() ? 1 : 0.4,
                }}
              >
                + {_('Heirs')}
              </button>
            </div>

            {/* Family tree visualization */}
            {currentCase && heirs.length > 0 && (
              <FamilyTreeCanvas inheritanceCase={currentCase} readOnly />
            )}

            {/* Heir cards */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {heirs.map((heir) => (
                <div key={heir.id} style={{ position: 'relative' }}>
                  <HeirCard heir={heir} />
                  <button
                    onClick={() => removeHeir(heir.id)}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: 'transparent', border: 'none', color: '#e07070',
                      cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
                    }}
                    aria-label="Remove heir"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {heirs.length === 0 && (
              <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '40px 0' }}>
                Add heirs to continue
              </p>
            )}
          </div>
        )}

        {step === 'results' && result && currentCase && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <FamilyTreeCanvas inheritanceCase={currentCase} readOnly />
            <ShareSummaryTable result={result} inheritanceCase={currentCase} locale="en" />
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {result.shares.map((share) => {
                const heir = heirs.find((h) => h.id === share.heirId)
                return heir ? <HeirCard key={heir.id} heir={heir} share={share} /> : null
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
