import { useState } from 'react'
import type { Deceased, Madhab, Gender } from '@mirath/core'

interface Props {
  onSubmit: (deceased: Deceased, madhab: Madhab) => void
  locale: 'en' | 'ar'
}

const MADHABS: Madhab[] = ['hanafi', 'maliki', 'shafii', 'hanbali']
const MADHAB_LABELS: Record<string, Record<Madhab, string>> = {
  en: { hanafi: 'Hanafi', maliki: 'Maliki', shafii: "Shafi'i", hanbali: 'Hanbali' },
  ar: { hanafi: 'حنفي', maliki: 'مالكي', shafii: 'شافعي', hanbali: 'حنبلي' },
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-bg, #0f0f0f)',
  border: '1px solid var(--color-border, #2a2a2a)',
  borderRadius: 'var(--radius, 8px)',
  color: 'var(--color-text, #e8e8e8)',
  fontSize: '0.9375rem',
  minHeight: 'var(--touch-target, 44px)',
  padding: '0 12px',
  width: '100%',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--color-muted, #888)',
  marginBottom: '4px',
  display: 'block',
}

export function CaseForm({ onSubmit, locale }: Props) {
  const isAr = locale === 'ar'
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [dateOfDeath, setDateOfDeath] = useState('')
  const [totalEstate, setTotalEstate] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [notes, setNotes] = useState('')
  const [madhab, setMadhab] = useState<Madhab>('hanafi')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const deceased: Deceased = {
      id: crypto.randomUUID(),
      name,
      gender,
      dateOfDeath: dateOfDeath || undefined,
      totalEstate: parseFloat(totalEstate) || 0,
      currency,
      notes: notes || undefined,
    }
    onSubmit(deceased, madhab)
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxWidth: '480px',
      }}
    >
      <div>
        <label style={labelStyle}>{isAr ? 'الاسم' : 'Name'}</label>
        <input
          style={inputStyle}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label style={labelStyle}>{isAr ? 'الجنس' : 'Gender'}</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['male', 'female'] as Gender[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              style={{
                ...inputStyle,
                flex: 1,
                cursor: 'pointer',
                fontWeight: gender === g ? 600 : 400,
                background: gender === g ? 'var(--color-accent, #c9a96e)' : 'var(--color-bg, #0f0f0f)',
                color: gender === g ? '#0f0f0f' : 'var(--color-text, #e8e8e8)',
                textAlign: 'center',
              }}
            >
              {g === 'male' ? (isAr ? 'ذكر' : 'Male') : (isAr ? 'أنثى' : 'Female')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>{isAr ? 'المذهب الفقهي' : 'School of Jurisprudence'}</label>
        <select
          style={{ ...inputStyle, appearance: 'auto' }}
          value={madhab}
          onChange={(e) => setMadhab(e.target.value as Madhab)}
        >
          {MADHABS.map((m) => (
            <option key={m} value={m}>{MADHAB_LABELS[locale][m]}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>{isAr ? 'تاريخ الوفاة' : 'Date of Death'}</label>
        <input
          style={inputStyle}
          type="date"
          value={dateOfDeath}
          onChange={(e) => setDateOfDeath(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>{isAr ? 'إجمالي التركة' : 'Total Estate'}</label>
          <input
            style={inputStyle}
            type="number"
            min="0"
            step="0.01"
            value={totalEstate}
            onChange={(e) => setTotalEstate(e.target.value)}
            required
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>{isAr ? 'العملة' : 'Currency'}</label>
          <select
            style={{ ...inputStyle, appearance: 'auto' }}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="SAR">SAR</option>
            <option value="AED">AED</option>
            <option value="EGP">EGP</option>
            <option value="KWD">KWD</option>
            <option value="QAR">QAR</option>
            <option value="BHD">BHD</option>
            <option value="OMR">OMR</option>
            <option value="JOD">JOD</option>
            <option value="TRY">TRY</option>
            <option value="MYR">MYR</option>
            <option value="IDR">IDR</option>
            <option value="PKR">PKR</option>
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>{isAr ? 'ملاحظات' : 'Notes'}</label>
        <textarea
          style={{ ...inputStyle, minHeight: '80px', padding: '12px', resize: 'vertical' }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <button
        type="submit"
        style={{
          background: 'var(--color-accent, #c9a96e)',
          border: 'none',
          borderRadius: 'var(--radius, 8px)',
          color: '#0f0f0f',
          cursor: 'pointer',
          fontSize: '0.9375rem',
          fontWeight: 600,
          minHeight: 'var(--touch-target, 44px)',
          padding: '0 24px',
        }}
      >
        {isAr ? 'متابعة' : 'Continue'}
      </button>
    </form>
  )
}
