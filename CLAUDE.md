# CLAUDE.md

## Project Overview

**SSOmatic** — Interactive AWS SSO credential manager with CLI and web UI, built with Bun + React + Ink.

## Structure

```
ssomatic/
├── src/
│   ├── aws/                   # Shared AWS logic (credential management)
│   │   ├── sso.ts             # SSO profiles, tokens, refresh, settings
│   │   ├── aws.ts             # STS identity utilities
│   │   └── utils.ts           # Clipboard, JSON formatting
│   ├── cli/                   # Terminal UI (React/Ink)
│   │   ├── index.tsx          # Entry point: CLI (default) or web (--web)
│   │   ├── components/        # Ink UI components
│   │   └── hooks/             # Ink hooks (useIdentity, useCopy)
│   └── web/                   # Web UI
│       ├── server.ts          # Bun HTTP server + RPC bridge
│       └── client/            # Vite SPA (React/Tailwind)
│           ├── index.html
│           ├── main.tsx
│           ├── App.tsx
│           ├── components/
│           ├── hooks/
│           └── lib/api.ts     # RPC client
├── dist/                      # Build output
│   ├── ssomatic               # Compiled CLI binary
│   └── web/                   # Vite build output
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

## Commands

```bash
bun install           # Install dependencies
bun run start         # Run CLI (terminal UI)
bun run dev           # Run web UI (dev mode: server + Vite)
bun run build         # Build web assets + CLI binary
bun run lint          # Run ESLint
```

## Usage

```bash
ssomatic              # Launch terminal UI (default)
ssomatic --web        # Start web server
```

## Commits & Releases

### Conventional Commits (enforced by commitlint)

```bash
feat(cli): add profile filtering      # New feature
fix(aws): handle empty clipboard       # Bug fix
docs: update README                    # Documentation
build(deps): upgrade aws-sdk           # Dependencies
```

**Allowed scopes:** `cli`, `web`, `aws`, `deps`, `ci`

### Changesets

After user-facing changes, always add a changeset:

```bash
bun run changeset
```
