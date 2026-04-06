import type { Heir, HeirShare } from '@mirath/core'

interface Props {
  heir: Heir
  share?: HeirShare
}

const shareTypeColors: Record<string, string> = {
  fixed: '#c9a96e',
  residuary: '#6ec9a9',
  excluded: '#888888',
  blocked: '#e07070',
}

const shareTypeLabels: Record<string, string> = {
  fixed: 'Fixed Share',
  residuary: 'Residuary',
  excluded: 'Excluded',
  blocked: 'Blocked',
}

export function HeirCard({ heir, share }: Props) {
  const borderColor = share ? shareTypeColors[share.shareType] || '#2a2a2a' : '#2a2a2a'

  return (
    <div
      style={{
        background: 'var(--color-surface, #1a1a1a)',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius, 8px)',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: '200px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text, #e8e8e8)' }}>
          {heir.name}
        </span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted, #888)' }}>
          {heir.gender === 'male' ? '♂' : '♀'}
        </span>
      </div>

      <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted, #888)' }}>
        {heir.relation.replace(/_/g, ' ')}
      </span>

      {share && share.shareType !== 'excluded' && share.shareType !== 'blocked' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.75rem',
                color: borderColor,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {shareTypeLabels[share.shareType]}
            </span>
            {share.fraction && (
              <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text, #e8e8e8)' }}>
                {share.fraction.numerator}/{share.fraction.denominator}
              </span>
            )}
          </div>
          {share.amount != null && (
            <span style={{ fontSize: '0.875rem', color: 'var(--color-accent, #c9a96e)', fontWeight: 500 }}>
              {share.amount.toLocaleString()}
            </span>
          )}
          {share.reason && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted, #888)', fontStyle: 'italic' }}>
              {share.reason}
            </span>
          )}
        </div>
      )}

      {share && (share.shareType === 'excluded' || share.shareType === 'blocked') && (
        <div style={{ marginTop: '4px' }}>
          <span
            style={{
              fontSize: '0.75rem',
              color: borderColor,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {shareTypeLabels[share.shareType]}
          </span>
          {share.reason && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted, #888)', fontStyle: 'italic', marginTop: '4px' }}>
              {share.reason}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
