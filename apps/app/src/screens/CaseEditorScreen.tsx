import { useLingui } from '@lingui/react'
import { useNavigate } from 'react-router-dom'
import styles from './CaseEditorScreen.module.css'

export function CaseEditorScreen() {
  const { _ } = useLingui()
  const navigate = useNavigate()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/')}>←</button>
        <h1 className={styles.title}>{_('New Case')}</h1>
        <div className={styles.actions}>
          <button className={styles.button}>{_('Calculate')}</button>
          <button className={styles.buttonSecondary}>{_('Save Case')}</button>
        </div>
      </header>
      <main className={styles.main}>
        <p className={styles.placeholder}>{_('Family Tree')}</p>
      </main>
    </div>
  )
}
