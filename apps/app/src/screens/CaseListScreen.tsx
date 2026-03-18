import { useLingui } from '@lingui/react'
import { useNavigate } from 'react-router-dom'
import styles from './CaseListScreen.module.css'

export function CaseListScreen() {
  const { _ } = useLingui()
  const navigate = useNavigate()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{_('Inheritance Calculator')}</h1>
        <div className={styles.actions}>
          <button className={styles.button} onClick={() => navigate('/case/new')}>
            {_('New Case')}
          </button>
          <button className={styles.buttonSecondary}>
            {_('Open Case')}
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <p className={styles.empty}>{_('New Case')}</p>
      </main>
    </div>
  )
}
