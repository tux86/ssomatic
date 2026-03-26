# CLAUDE.md

## Project Overview

**SSOmatic** — Interactive AWS SSO credential manager with CLI and web UI, built with Bun + React + Ink.

Single entry point — the CLI is the main app. Press `w` to toggle a built-in web server. Settings (favorites, notifications, web server state, port) are persisted across sessions.

## Structure

```
ssomatic/
├── src/
│   ├── aws/                   # Shared AWS logic (UI-agnostic)
│   │   ├── sso.ts             # SSO profiles, tokens, refresh, settings
│   │   ├── aws.ts             # STS identity utilities
│   │   └── utils.ts           # Clipboard, JSON formatting
│   ├── cli/                   # Terminal UI (React/Ink)
│   │   ├── index.tsx          # Entry point + web server toggle
│   │   ├── components/        # Ink UI components
│   │   └── hooks/             # Ink hooks (useIdentity, useCopy)
│   └── web/                   # Web UI
│       ├── server.ts          # Bun HTTP server + RPC bridge (start/stop API)
│       └── client/            # Vite SPA (React/Tailwind)
│           ├── index.html
│           ├── main.tsx
│           ├── App.tsx
│           ├── components/
│           ├── hooks/
│           └── lib/api.ts     # RPC client
├── dist/                      # Build output
│   └── ssomatic               # Compiled CLI binary (web assets embedded)
├── docs/screenshots/          # Demo GIFs for README
├── .releaserc.json            # semantic-release config
├── package.json
├── tsconfig.json              # Server/CLI TypeScript config
├── tsconfig.web.json          # Web client TypeScript config (DOM libs)
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

## Tech Stack

| Tool | Purpose |
|------|---------|
| Bun | Runtime & package manager |
| TypeScript | Language |
| React | Component framework |
| Ink | React renderer for CLI |
| Vite | Web UI dev server & bundler |
| Tailwind CSS | Web UI styling |
| ESLint | Linting (flat config) |
| semantic-release | Automated versioning & releases |

## Commands

```bash
bun install           # Install dependencies
bun run start         # Run CLI
bun run dev           # Run CLI with --watch (auto-restart on changes)
bun run build         # Build web assets + CLI binary
bun run lint          # Run ESLint
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `w` | Toggle web server on/off (persisted) |
| `Escape` | Back |
| `q` | Quit |

## Commits & Releases

### Conventional Commits (enforced by commitlint)

```bash
feat(cli): add profile filtering      # New feature → minor bump
fix(aws): handle empty clipboard       # Bug fix → patch bump
docs: update README                    # No release
build(deps): upgrade aws-sdk           # No release
```

**Allowed scopes:** `cli`, `web`, `aws`, `deps`, `ci`

### Releases

Fully automated via **semantic-release**. Push to `main` with conventional commits → CI passes → version bumped, CHANGELOG.md updated, GitHub release created with binary attached. No manual steps.

**Requires:** `RELEASE_TOKEN` secret in GitHub repo settings (PAT with `contents: write` scope).
