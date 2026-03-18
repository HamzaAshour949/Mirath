import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useLingui } from '@lingui/react'
import styles from './LicenseActivationScreen.module.css'

interface Props {
  onActivated: () => void
}

export function LicenseActivationScreen({ onActivated }: Props) {
  const { _ } = useLingui()
  const [licenseJson, setLicenseJson] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleActivate() {
    if (!licenseJson.trim()) return
    setError(null)
    setLoading(true)
    try {
      await invoke('activate_license', { licenseJson: licenseJson.trim() })
      onActivated()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{_('Activate License')}</h1>
        <label className={styles.label} htmlFor="license-input">
          {_('License Key')}
        </label>
        <textarea
          id="license-input"
          className={styles.textarea}
          value={licenseJson}
          onChange={(e) => setLicenseJson(e.target.value)}
          placeholder="{...}"
          rows={8}
          spellCheck={false}
        />
        {error && <p className={styles.error}>{error}</p>}
        <button
          className={styles.button}
          onClick={handleActivate}
          disabled={loading || !licenseJson.trim()}
        >
          {loading ? '…' : _('Activate License')}
        </button>
      </div>
    </div>
  )
}
