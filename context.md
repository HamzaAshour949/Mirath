# Mirath — Project Context

> Read this file fully before touching any code. It is the single source of truth for
> how this project is structured, what every piece does, and the decisions behind it.

---

## What Is Mirath?

**Mirath** (ميراث, Arabic for "inheritance") is a professional desktop and tablet
application for calculating Islamic inheritance (Fara'id — علم الفرائض) according to
all four Sunni madhabs: Hanafi, Maliki, Shafi'i, and Hanbali.

Target users: Islamic scholars, lawyers, notaries, and family advisors who handle
estate division cases professionally.

**Business model:** One-time purchase per device. Sold via the marketing website.
Payments accepted via Stripe (card) and x402/USDC (crypto). No subscription.

---

## Monorepo Structure

```
mirath/
├── apps/
│   ├── app/              → Main app (Tauri 2.0 — desktop + tablet)
│   ├── web/              → Web version (React + Vite — license-gated)
│   ├── admin/            → Admin dashboard (Next.js — owner only)
│   ├── marketing/        → Marketing + purchase website (Astro)
│   └── license-server/   → License activation + revocation API (Node/Express)
│
├── packages/
│   ├── core/             → Inheritance calculation engine (pure TypeScript)
│   ├── ui/               → Shared React components (touch-friendly, RTL-aware)
│   ├── i18n/             → Arabic + English translations (LinguiJS)
│   ├── pdf/              → PDF report generation (pdfmake-rtl)
│   ├── docx/             → DOCX report generation (docxtemplater)
│   └── mirath-format/    → .mirath file encoder/decoder
│
├── rust/
│   └── (Tauri Rust backend lives inside apps/app/src-tauri/)
│
├── context.md            ← YOU ARE HERE
├── turbo.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

Package names use the `@mirath/` scope:
- `@mirath/core`, `@mirath/ui`, `@mirath/i18n`, `@mirath/pdf`,
  `@mirath/docx`, `@mirath/mirath-format`

---

## Apps

### `apps/app` — Main Application (Tauri 2.0)
**Platforms:** macOS, Windows, Linux, iOS (tablet), Android (tablet)
**Stack:** Tauri 2.0 + React 18 + Vite + TypeScript
**Rust backend:** `apps/app/src-tauri/src/`

What it does:
- Renders the full UI (React frontend served by Tauri's webview)
- Handles hardware fingerprinting and license validation (Rust)
- Reads/writes `.mirath` files to disk (Rust)
- Triggers PDF/DOCX generation
- All platform-specific native operations go through Tauri commands (IPC)

Tauri commands (defined in Rust, called from React via `invoke()`):
- `get_hardware_fingerprint` → returns SHA-256 fingerprint string
- `activate_license` → validates and stores license file
- `check_license` → verifies license on startup
- `open_mirath_file` → reads and decrypts a .mirath file
- `save_mirath_file` → encrypts and saves a .mirath file

Dev: `pnpm dev` inside `apps/app/` (starts Vite + Tauri simultaneously)

---

### `apps/web` — Web Version (React + Vite)
**Stack:** React 18 + Vite + TypeScript

A full-featured web version of the app, accessible from a browser.
License-gated: user must enter a valid license key to access.

**Important:** The core inheritance calculations run **server-side** via the
`license-server` API — NOT in the browser. The client sends the case data and
receives results. This protects the calculation algorithm from being extracted.

Auth flow: license key → POST to license-server → JWT session token → app unlocks.

Dev: `pnpm dev` inside `apps/web/`

---

### `apps/admin` — Admin Dashboard (Next.js 14, App Router)
**Stack:** Next.js 14 + TypeScript

Owner-only dashboard. Not public. Used to:
- View all issued licenses (active, revoked)
- See activation details (device fingerprint, date)
- View customer contact info and purchase history
- Manually revoke or reissue licenses
- See revenue from Stripe and x402

Connects to the same DB as `license-server`.

Dev: `pnpm dev` inside `apps/admin/`

---

### `apps/marketing` — Marketing Website (Astro)
**Stack:** Astro 4 + TypeScript + React islands

Public-facing website. Contains:
- Landing page with feature showcase
- Pricing + purchase flow (Stripe + x402)
- Download page (post-purchase)
- Arabic + English language toggle
- SEO optimized, fully static

After a purchase is completed (Stripe webhook or x402 payment confirmation),
the site calls `license-server /activate` to generate a license, then shows the
user their license key and download link.

Dev: `pnpm dev` inside `apps/marketing/`

---

### `apps/license-server` — License API (Node.js + Express)
**Stack:** Node.js + Express + TypeScript

The backbone of the licensing system. Two responsibilities:
1. **Activation:** sign a license file with Ed25519 private key
2. **Revocation check:** answer "is this license still valid?"

Endpoints:
```
POST /activate
  body: { purchaseToken: string, fingerprint: FingerprintComponents }
  → returns signed .lic JSON (license file content)

GET  /license/:lid/status
  → returns { valid: boolean, revoked: boolean }

POST /admin/revoke (admin-only, bearer token protected)
  body: { licenseId: string }
  → revokes a license
```

The Ed25519 **private key** lives only on this server as an environment variable.
It is NEVER committed to git, NEVER shipped to clients.
The corresponding **public key** is embedded in the Tauri Rust binary.

DB: SQLite (via better-sqlite3) for simplicity. Schema:
```sql
licenses (id, email, fingerprint_hash, issued_at, revoked_at, purchase_ref, purchase_method)
```

Dev: `pnpm dev` inside `apps/license-server/`

---

## Packages

### `packages/core` — Inheritance Calculation Engine
**Stack:** Pure TypeScript, zero dependencies, fully testable

The most critical package. Contains:
- All types/interfaces for the domain model
- Inheritance calculation logic for all 4 Sunni madhabs
- Handles: fixed shares (Ashaab al-Furud), residuaries (Asabat),
  blocking (Hajb), proportional increase (Awl), remainder return (Radd)

**This package must never have side effects.** Input in → result out.
It runs in: Tauri app (React side), web app (via license-server), and tests.

Key types:
```ts
Madhab = 'hanafi' | 'maliki' | 'shafii' | 'hanbali'
HeirRelation = 'husband' | 'wife' | 'son' | 'daughter' | 'father' | 'mother' | ...
InheritanceCase = { id, deceased, heirs, madhab, familyTree, notes, ... }
CalculationResult = { shares: HeirShare[], totalAllocated, remainderMethod, warnings }
```

---

### `packages/ui` — Shared UI Components
**Stack:** React 18 + TypeScript + CSS Modules

Reusable components used by `apps/app` and `apps/web`:
- `FamilyTreeCanvas` — interactive, touch-friendly tree editor
- `HeirCard` — displays an heir's details and computed share
- `CaseForm` — form to enter deceased details
- `ShareSummaryTable` — results table, RTL/LTR aware
- `LanguageToggle` — switches between Arabic and English

Design principles:
- Touch-friendly: minimum 44×44px tap targets
- RTL-aware: all components flip correctly for Arabic
- Minimal, elegant, professional — no gradients, no clutter
- Works on both desktop (mouse) and tablet (touch)

---

### `packages/i18n` — Translations
**Stack:** LinguiJS

Supported locales: `ar` (Arabic, RTL), `en` (English, LTR)
Translation files live in `packages/i18n/locales/`

Usage in components:
```tsx
import { useLingui } from '@lingui/react'
const { _ } = useLingui()
return <h1>{_('Inheritance Calculator')}</h1>
```

---

### `packages/pdf` — PDF Report Generation
**Stack:** pdfmake-rtl

Generates professional PDF reports from a `CalculationResult`.
Handles Arabic (RTL) and English (LTR) layouts automatically.
Embeds the family tree diagram as a vector image.

Usage:
```ts
import { generatePDF } from '@mirath/pdf'
const blob = await generatePDF(calculationResult, 'ar') // or 'en'
```

---

### `packages/docx` — DOCX Report Generation
**Stack:** docxtemplater

Generates .docx reports using a Word template.
Templates live in `packages/docx/templates/`.
Supports Arabic (RTL) and English (LTR).

Usage:
```ts
import { generateDOCX } from '@mirath/docx'
const buffer = await generateDOCX(calculationResult, 'en')
```

---

### `packages/mirath-format` — .mirath File Format
**Stack:** TypeScript + AES-256-GCM (via Web Crypto API)

Defines the custom `.mirath` file format:
- Binary structure: `[4-byte magic: 4D495254] [2-byte version] [encrypted payload]`
- Payload: `zstd-compressed JSON` encrypted with `AES-256-GCM`
- Contains: `InheritanceCase` + `CalculationResult` + metadata
- Signed to detect tampering

Usage:
```ts
import { encodeMirath, decodeMirath } from '@mirath/mirath-format'
const bytes = await encodeMirath(caseData, appKey)
const caseData = await decodeMirath(bytes, appKey)
```

Note: The encryption key is derived from the app's license, making `.mirath`
files tied to a valid installation.

---

## Hardware Licensing System

### How it works (summary)
1. User purchases on marketing site
2. App generates a hardware fingerprint (Rust): hash of CPU + Motherboard UUID +
   Machine ID + MAC address combined with SHA-256
3. App sends fingerprint + purchase token to `license-server /activate`
4. Server signs the license payload with its Ed25519 private key
5. App stores the signed `.lic` file locally:
   - macOS: `~/Library/Application Support/Mirath/license.lic`
   - Windows: `%APPDATA%\Mirath\license.lic`
   - Linux: `~/.config/mirath/license.lic`
6. On every startup: verify signature (offline) + check fingerprint (3-of-4 components
   must match, for tolerance of hardware upgrades)
7. Every 7 days: background check against `license-server /license/:lid/status`

### Tolerance model
The fingerprint stores each component individually. 3 of 4 must match.
This means: replacing the NIC or a minor hardware change won't break activation.
Replacing the motherboard (major change) → user contacts support for re-activation.

### What's NOT crackable
The Ed25519 signature is mathematically unforgeable without the private key.
A cracker could patch the binary to skip the check, but:
- Rust binary is compiled native code (hard to reverse vs. JS)
- macOS Notarization + Windows Authenticode prevent binary tampering
- The core calculation logic in `packages/core` weaves the license state check
  into its operation — removing the check corrupts results

---

## Payments

### Stripe
Used for card payments. After successful checkout:
- Stripe webhook calls `license-server` to record the purchase
- License key is generated and emailed to the user

### x402 (Coinbase)
Used for crypto payments (USDC on Base network).
After payment confirmation via x402:
- Same flow as Stripe — license key generated and delivered

Both payment methods are handled in `apps/marketing`.

---

## i18n Rules

- Default locale: `en` (English, LTR)
- Second locale: `ar` (Arabic, RTL)
- When locale is `ar`: set `dir="rtl"` on `<html>`, flip all layout
- Font for Arabic: Noto Naskh Arabic (professional, used in legal documents)
- Font for English: Inter

---

## Development Approach

**Develop one app at a time** to keep scope focused.
Suggested order:
1. `packages/core` — build and test the calculation engine first (no UI)
2. `apps/app` — main Tauri desktop app (the primary product)
3. `apps/license-server` — needed before the app can be activated
4. `apps/marketing` — needed to sell
5. `apps/admin` — monitoring
6. `packages/pdf` + `packages/docx` — reporting features
7. `apps/web` — web version last

When working on a specific app, you only need to understand:
- That app's directory
- The `packages/` it imports from
- This `context.md`

---

## Environment Variables

### `apps/license-server`
```
ED25519_PRIVATE_KEY=   # base64-encoded Ed25519 private key (NEVER commit)
ADMIN_TOKEN=           # bearer token for /admin/* endpoints
DATABASE_PATH=         # path to SQLite file (default: ./data/mirath.db)
PORT=                  # server port (default: 3001)
STRIPE_WEBHOOK_SECRET= # Stripe webhook signing secret
X402_FACILITATOR_URL=  # x402 facilitator endpoint
```

### `apps/marketing`
```
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
LICENSE_SERVER_URL=    # URL of the license-server
X402_RECIPIENT_ADDRESS= # your USDC wallet address on Base
```

### `apps/admin`
```
LICENSE_SERVER_URL=
ADMIN_TOKEN=           # same as license-server ADMIN_TOKEN
```

### `apps/app` (Tauri — compile-time)
```
ED25519_PUBLIC_KEY=    # base64-encoded public key, baked into the binary at build time
LICENSE_SERVER_URL=    # for activation and periodic validation
```

---

## Key Domain Terms (for the calculation engine)

| Term | Meaning |
|------|---------|
| Fara'id (فرائض) | The science of Islamic inheritance |
| Ashaab al-Furud | Heirs with fixed Quranic shares (1/2, 1/4, 1/8, 2/3, 1/3, 1/6) |
| Asabat (عصبة) | Residuary heirs — receive what's left after fixed shares |
| Hajb (حجب) | Blocking — a closer heir prevents a more distant one from inheriting |
| Awl (عول) | Proportional reduction — when fixed shares exceed 1, all are reduced proportionally |
| Radd (رد) | Return — when fixed shares are less than 1, remainder returns to fixed-share heirs |
| Madhab (مذهب) | School of Islamic jurisprudence |
| Murrath (موروث) | The deceased person |
| Tarika (تركة) | The total estate |
