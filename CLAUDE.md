# Claude Agent Instructions — Mirath

Read `context.md` fully before doing anything else. It is the single source of truth
for this project's structure, tech stack, and domain knowledge.

---

## Structural Changes — Require Explicit User Permission

A **structural change** is any of the following:
- Adding, removing, or renaming a directory under `apps/` or `packages/`
- Adding or removing a workspace package (changing `pnpm-workspace.yaml`)
- Adding or removing a Turborepo task (changing `turbo.json`)
- Changing which packages an app depends on
- Renaming or moving files across package boundaries
- Adding a new Tauri command (changes the IPC contract between Rust and React)
- Changing the `.mirath` file format or the license file format
- Changing the DB schema in `license-server`

**Before making any structural change:**
1. Stop and describe the change to the user
2. Explain why it is needed
3. Wait for explicit approval ("yes", "go ahead", "approved")
4. Only then make the change
5. Immediately update `context.md` to reflect the new structure

Refactoring within a file, adding functions, fixing bugs, and implementing TODOs
are **not** structural changes and do not require permission.

---

## Git Commit Rules

Every change must be committed separately and follow these rules:

**Format:** Conventional Commits
```
<type>(<scope>): <short description>

[optional body — explain WHY, not what]
```

**Types:**
- `feat` — new functionality
- `fix` — bug fix
- `chore` — tooling, config, dependencies
- `refactor` — restructuring without behavior change
- `test` — adding or updating tests
- `docs` — documentation only (including context.md updates)
- `style` — formatting only

**Scope:** the app or package name, e.g. `core`, `app`, `license-server`, `ui`, `i18n`

**Examples:**
```
feat(core): implement Hanafi fixed shares calculation
fix(license-server): handle missing email field in activate route
chore(app): add ed25519-dalek dependency to Cargo.toml
docs(root): update context.md to reflect new folder structure
refactor(ui): extract ShareRow into its own component
```

**Rules:**
- One logical change per commit — never bundle unrelated changes
- Never commit `.env` files or secrets
- Never use `git add -A` or `git add .` — always stage specific files
- Write commit messages that explain the intent, not just "updated X"
- Never amend or force-push after a commit is made

---

## General Rules

- Always read a file before editing it
- Implement one thing at a time — do not refactor surrounding code while fixing a bug
- Do not add comments, docstrings, or type annotations to code you did not change
- Do not add error handling for scenarios that cannot happen
- Keep the minimum complexity needed for the current task
