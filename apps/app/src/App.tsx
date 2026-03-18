import { useState, useEffect } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { I18nProvider } from '@lingui/react'
import { invoke } from '@tauri-apps/api/core'
import { i18n, setupI18n, type Locale } from '@mirath/i18n'
import { LicenseActivationScreen } from './screens/LicenseActivationScreen'
import { CaseListScreen } from './screens/CaseListScreen'
import { CaseEditorScreen } from './screens/CaseEditorScreen'

interface LicenseStatus {
  valid: boolean
  licenseId: string
  email: string
}

export function App() {
  const [locale] = useState<Locale>('en')
  const [i18nReady, setI18nReady] = useState(false)
  const [licenseValid, setLicenseValid] = useState<boolean | null>(null)

  useEffect(() => {
    setupI18n(locale).then(() => setI18nReady(true))
  }, [locale])

  useEffect(() => {
    invoke<LicenseStatus>('check_license')
      .then((status) => setLicenseValid(status.valid))
      .catch(() => setLicenseValid(false))
  }, [])

  if (!i18nReady || licenseValid === null) {
    return null
  }

  if (!licenseValid) {
    return (
      <I18nProvider i18n={i18n}>
        <LicenseActivationScreen onActivated={() => setLicenseValid(true)} />
      </I18nProvider>
    )
  }

  return (
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<CaseListScreen />} />
          <Route path="/case/new" element={<CaseEditorScreen />} />
          <Route path="/case/:id" element={<CaseEditorScreen />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  )
}
