interface Props {
  locale: 'en' | 'ar'
  onChange: (locale: 'en' | 'ar') => void
}

/**
 * Switches between English and Arabic.
 * Toggling to 'ar' should also set dir="rtl" on the root element.
 * TODO: implement.
 */
export function LanguageToggle(_props: Props) {
  return null
}
