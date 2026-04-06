import type { CalculationResult, InheritanceCase } from '@mirath/core'

interface Props {
  result: CalculationResult
  inheritanceCase: InheritanceCase
  locale: 'en' | 'ar'
}

const shareTypeLabels: Record<string, Record<string, string>> = {
  en: { fixed: 'Fixed Share', residuary: 'Residuary', excluded: 'Excluded', blocked: 'Blocked' },
  ar: { fixed: 'فرض', residuary: 'عصبة', excluded: 'محجوب', blocked: 'محجوب حجب حرمان' },
}

const remainderLabels: Record<string, Record<string, string>> = {
  en: { awl: 'Awl (Proportional Reduction)', radd: 'Radd (Remainder Return)', none: 'None' },
  ar: { awl: 'عول (تخفيض نسبي)', radd: 'رد (إرجاع الباقي)', none: 'لا يوجد' },
}

const thStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-muted, #888)',
  padding: '12px 16px',
  textAlign: 'start',
  borderBottom: '1px solid var(--color-border, #2a2a2a)',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '0.9375rem',
  borderBottom: '1px solid var(--color-border, #2a2a2a)',
  color: 'var(--color-text, #e8e8e8)',
}

export function ShareSummaryTable({ result, inheritanceCase, locale }: Props) {
  const isAr = locale === 'ar'
  const labels = shareTypeLabels[locale]
  const heirsMap = new Map(inheritanceCase.heirs.map((h) => [h.id, h]))

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          background: 'var(--color-surface, #1a1a1a)',
          borderRadius: 'var(--radius, 8px)',
          overflow: 'hidden',
        }}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <thead>
          <tr>
            <th style={thStyle}>{isAr ? 'الوارث' : 'Heir'}</th>
            <th style={thStyle}>{isAr ? 'الصلة' : 'Relation'}</th>
            <th style={thStyle}>{isAr ? 'النوع' : 'Type'}</th>
            <th style={thStyle}>{isAr ? 'النصيب' : 'Share'}</th>
            <th style={{ ...thStyle, textAlign: 'end' }}>{isAr ? 'المبلغ' : 'Amount'}</th>
          </tr>
        </thead>
        <tbody>
          {result.shares.map((share) => {
            const heir = heirsMap.get(share.heirId)
            if (!heir) return null
            return (
              <tr key={share.heirId}>
                <td style={{ ...tdStyle, fontWeight: 500 }}>{heir.name}</td>
                <td style={{ ...tdStyle, color: 'var(--color-muted, #888)', fontSize: '0.8125rem' }}>
                  {heir.relation.replace(/_/g, ' ')}
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color:
                        share.shareType === 'fixed' ? '#c9a96e'
                        : share.shareType === 'residuary' ? '#6ec9a9'
                        : share.shareType === 'blocked' ? '#e07070'
                        : '#888',
                    }}
                  >
                    {labels[share.shareType]}
                  </span>
                </td>
                <td style={tdStyle}>
                  {share.fraction
                    ? `${share.fraction.numerator}/${share.fraction.denominator}`
                    : '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'end', fontWeight: 600, color: 'var(--color-accent, #c9a96e)' }}>
                  {share.amount != null
                    ? `${share.amount.toLocaleString()} ${inheritanceCase.deceased.currency}`
                    : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '16px',
          padding: '12px 16px',
          background: 'var(--color-surface, #1a1a1a)',
          borderRadius: 'var(--radius, 8px)',
          fontSize: '0.875rem',
        }}
      >
        <div>
          <span style={{ color: 'var(--color-muted, #888)' }}>
            {isAr ? 'طريقة التوزيع: ' : 'Remainder Method: '}
          </span>
          <span style={{ color: 'var(--color-text, #e8e8e8)', fontWeight: 500 }}>
            {remainderLabels[locale][result.remainderMethod]}
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--color-muted, #888)' }}>
            {isAr ? 'الإجمالي الموزع: ' : 'Total Allocated: '}
          </span>
          <span style={{ color: 'var(--color-accent, #c9a96e)', fontWeight: 600 }}>
            {result.totalAllocated.toLocaleString()} {inheritanceCase.deceased.currency}
          </span>
        </div>
      </div>

      {result.warnings.length > 0 && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px 16px',
            background: 'rgba(224, 112, 112, 0.1)',
            border: '1px solid rgba(224, 112, 112, 0.3)',
            borderRadius: 'var(--radius, 8px)',
          }}
        >
          {result.warnings.map((w, i) => (
            <p key={i} style={{ fontSize: '0.8125rem', color: '#e07070', margin: '4px 0' }}>
              ⚠ {w}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
