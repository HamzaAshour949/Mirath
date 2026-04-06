interface Props {
  locale: 'en' | 'ar'
  onChange: (locale: 'en' | 'ar') => void
}

export function LanguageToggle({ locale, onChange }: Props) {
  const next = locale === 'en' ? 'ar' : 'en'

  function handleToggle() {
    const root = document.documentElement
    root.dir = next === 'ar' ? 'rtl' : 'ltr'
    root.lang = next
    onChange(next)
  }

  return (
    <button
      onClick={handleToggle}
      aria-label={locale === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
      style={{
        background: 'transparent',
        border: '1px solid var(--color-border, #2a2a2a)',
        borderRadius: 'var(--radius, 8px)',
        color: 'var(--color-text, #e8e8e8)',
        cursor: 'pointer',
        fontSize: '0.9375rem',
        fontWeight: 500,
        minHeight: 'var(--touch-target, 44px)',
        minWidth: 'var(--touch-target, 44px)',
        padding: '0 16px',
      }}
    >
      {locale === 'en' ? 'العربية' : 'English'}
    </button>
  )
}
