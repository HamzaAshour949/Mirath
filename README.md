# Mirath (ميراث)

An Islamic inheritance (farāʾiḍ) calculator for the four Sunni schools: Hanafi,
Maliki, Shafiʿi and Hanbali. You enter the deceased, the estate and the
surviving relatives. It works out who is blocked, who takes a fixed share and
who takes the residue, and it applies ʿawl or radd when the shares do not add
up to the whole estate. Shares are kept as exact fractions until the money is
divided.

> **العربية:** [README.ar.md](README.ar.md)

**Status: in development.** The calculation engine is the finished, tested
part. The apps around it are partly built. The table below says what runs
today and what does not.

![A case worked out in the desktop app: wife 1/8, father and mother 1/6 each, two sons and a daughter sharing the residue 2:2:1](docs/screenshots/results.webp)

## What works today

| Part | Path | State |
| --- | --- | --- |
| Calculation engine | `packages/core` | **Works.** 67 tests pass. |
| Shared UI | `packages/ui` | Works: case form, heir cards, share table, family tree. |
| Desktop app | `apps/app` | The React UI runs and calculates locally with the engine. The Tauri (Rust) side does not compile yet. |
| Marketing site | `apps/marketing` | Builds. English and Arabic pages with a one-time price. |
| License server | `apps/license-server` | Issues Ed25519-signed, device-bound licenses; status, revoke, stats and list endpoints. It does not verify payments yet: any unused purchase token is accepted. |
| Admin dashboard | `apps/admin` | Next.js page that lists licenses. Builds; `tsc` reports one error. |
| Web version | `apps/web` | UI only. It posts to a `/calculate` route the license server does not have, and its activation request leaves out fields the server requires, so it cannot get past the license screen. |
| PDF reports | `packages/pdf` | Builds. Not used by any app yet. |
| DOCX reports | `packages/docx` | Does not build (an unused import fails `noUnusedLocals`). Not used by any app yet. |
| `.mirath` files | `packages/mirath-format` | Compressed JSON encrypted with AES-256-GCM. Does not build on TypeScript 5.9 (`Uint8Array` typing). Not used by any app yet. |
| Translations | `packages/i18n` | Arabic and English strings exist, but they are not loaded (see below), so the apps show English. |

## The calculation engine

`packages/core` is plain TypeScript with no runtime dependencies. `calculate()`
takes a case and returns every heir's share, the reason for it, and the amount.

It runs in this order:

1. **Ḥajb (blocking).** Removes heirs excluded by closer relatives, with the
   rules that differ between the schools (for example the paternal
   grandfather and the grandmothers).
2. **Furūḍ (fixed shares).** Spouses, parents, daughters, granddaughters
   through a son, sisters and maternal siblings, including the
   ʿUmariyyatān cases.
3. **ʿAṣaba (residuaries).** Sons, brothers, nephews and uncles, with a male
   heir taking twice a female heir's share where the rule applies.
4. **ʿAwl or radd.** Scales the shares down when they exceed the estate, or
   returns the surplus to the eligible heirs when nobody takes the residue.

The tests cover each of these steps, the grandfather-with-siblings
disagreement between the schools, predeceased heirs, single-heir estates and
several mixed families, and check the money as well as the fractions.

## Requirements

- Node.js 20 or newer
- pnpm 9
- Rust, only for the Tauri desktop shell

## Running it

```bash
pnpm install
```

Engine tests (there is no root `test` script):

```bash
pnpm --filter @mirath/core test
```

Desktop app UI in the browser, on port 1420:

```bash
cd apps/app && npx vite --port 1420
```

Outside Tauri the license check has nothing to talk to, so the app stops at
the activation screen.

Marketing site, on port 4321:

```bash
pnpm --filter @mirath/marketing dev
```

License server, on port 3001. It needs an `apps/license-server/.env`: copy
`.env.example`, set `ADMIN_TOKEN` to a random string (admin requests send it
as `Authorization: Bearer …`), and set `ED25519_PRIVATE_KEY` to a base64 DER
(PKCS#8) key, which this prints:

```bash
node -e "console.log(require('crypto').generateKeyPairSync('ed25519').privateKey.export({format:'der',type:'pkcs8'}).toString('base64'))"
mkdir -p apps/license-server/data
pnpm --filter @mirath/license-server dev
```

Admin dashboard:

```bash
pnpm --filter @mirath/admin dev
```

`pnpm dev` at the root starts every package through Turborepo, but the
desktop app's entry in that run fails (see below).

## Known issues

- **Tauri does not compile.** `apps/app/src-tauri/src/commands.rs` turns the
  dialog plugin's `FilePath` into a `PathBuf` with `.into()`, which
  `tauri-plugin-dialog` 2 no longer supports (it needs `into_path()`).
- **Tauri's dev and build hooks call themselves.** In
  `apps/app/src-tauri/tauri.conf.json`, `beforeDevCommand` is
  `pnpm dev --filter …` and `beforeBuildCommand` is `pnpm build --filter …`.
  Run from `apps/app`, those start `tauri dev` and `tauri build` again
  instead of Vite.
- **Translations never load.** `setupI18n` reads `{ messages }` from the
  locale JSON, but the files are flat key/value maps with no `messages` key,
  so Lingui throws and the Arabic strings are never used.
- **`pnpm typecheck` fails** in `admin`, `app` (no type declarations for CSS
  modules), `docx`, `license-server` (inferred router types that cannot be
  named) and `mirath-format`.
- **No payment integration yet.** The plan is Stripe and x402/USDC; the
  server only records which one a token looks like.

## Layout

```
apps/
  app/             Tauri 2 + React desktop and tablet app
  web/             React + Vite web version (license-gated)
  admin/           Next.js 14 license dashboard
  marketing/       Astro site, English and Arabic
  license-server/  Express + SQLite license activation API
packages/
  core/            the calculation engine
  ui/              shared React components, RTL-aware
  i18n/            Arabic and English strings (Lingui)
  pdf/             PDF reports (pdfmake)
  docx/            DOCX reports (docxtemplater)
  mirath-format/   .mirath file encoding
```

`context.md` holds the full design notes: the license format, the file
format and the business model.

## Security

Licenses are signed with an Ed25519 key that only the license server holds;
the app checks them with the public key and a hardware fingerprint. Keep the
signing key, the admin token and database paths in local `.env` files, which
are git-ignored, and never commit them.
