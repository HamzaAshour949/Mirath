import { useState } from 'react'

/**
 * Web version root.
 *
 * On load: check for a stored session token (localStorage).
 * If none → show LicenseGate (license key entry screen).
 * If valid → show the main app.
 *
 * Note: core calculations are sent to license-server and executed server-side.
 * The algorithm never runs in the browser.
 *
 * TODO: implement license gate, session management, and main app layout.
 */
export function App() {
  const [_licensed] = useState(false)

  return (
    <div>
      <p>Mirath Web — boilerplate. Implement App.tsx.</p>
    </div>
  )
}
