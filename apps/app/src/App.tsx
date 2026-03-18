import { useState, useEffect } from 'react'
import { setupI18n, type Locale } from '@mirath/i18n'

/**
 * Root app component.
 *
 * Responsibilities:
 * - Check license on startup (via Tauri command `check_license`)
 * - Set up i18n locale
 * - Route between: LicenseActivation, MainApp screens
 *
 * TODO: implement license check, routing, and main layout.
 */
export function App() {
  const [locale, setLocale] = useState<Locale>('en')
  const [_licenseValid, setLicenseValid] = useState<boolean | null>(null)

  useEffect(() => {
    setupI18n(locale)
  }, [locale])

  useEffect(() => {
    // TODO: call Tauri command `check_license` on startup
    // invoke('check_license').then(valid => setLicenseValid(valid))
    setLicenseValid(false)
  }, [])

  void setLocale // will be wired to LanguageToggle

  return (
    <div>
      <p>Mirath — boilerplate. Implement App.tsx.</p>
    </div>
  )
}
