# SSOmatic

Interactive AWS SSO credential manager with CLI and web UI.

[![CI](https://github.com/tux86/ssomatic/actions/workflows/ci.yml/badge.svg)](https://github.com/tux86/ssomatic/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?logo=bun&logoColor=white)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## Demo

### CLI

<p align="center">
  <img src="docs/screenshots/cli-demo.gif" alt="SSOmatic CLI Demo" width="720">
</p>

### Web UI

<p align="center">
  <img src="docs/screenshots/web-demo.gif" alt="SSOmatic Web UI Demo" width="720">
</p>

## Features

- **Auto-discovery** — Scans `~/.aws/config` for SSO profiles (legacy and sso_session)
- **Status dashboard** — View credential validity with expiry countdown
- **Multi-select refresh** — Refresh multiple profiles at once with SSO device auth
- **Auto-refresh daemon** — Background process to keep credentials fresh
- **Built-in web UI** — Toggle a web server from the CLI with `w` for a browser-based dashboard
- **Desktop notifications** — Alerts when credentials expire (macOS/Linux)
- **Persistent settings** — Notifications, favorites, web server, port — all saved across sessions

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [AWS CLI v2](https://aws.amazon.com/cli/) configured with SSO profiles in `~/.aws/config`

## Getting Started

```bash
git clone https://github.com/tux86/ssomatic.git
cd ssomatic
bun install
bun run start
```

## Usage

```bash
bun run start         # Run the CLI
bun run dev           # Run with --watch (auto-restart on changes)
bun run build         # Build web assets + compiled binary
bun run lint          # Run ESLint
```

Press `w` inside the CLI to toggle the web UI server. The URL is shown at the bottom of the terminal. The web server state and port are saved in settings.

## Building

```bash
bun run build

# Output:
#   dist/ssomatic      — standalone CLI binary
#   dist/web/           — web UI assets (served by the built-in web server)
```

### Global Installation

```bash
ln -s $(pwd)/dist/ssomatic ~/.local/bin/ssomatic
```

## Project Structure

```
ssomatic/
├── src/
│   ├── aws/           # Shared AWS credential logic (sso.ts, aws.ts, utils.ts)
│   ├── cli/           # Terminal UI (React/Ink) — entry point
│   │   ├── index.tsx   # Main app + web server toggle
│   │   ├── components/ # Ink UI components
│   │   └── hooks/      # useIdentity, useCopy
│   └── web/
│       ├── server.ts   # Bun HTTP server + RPC bridge
│       └── client/     # Web UI SPA (React/Vite/Tailwind)
├── dist/              # Build output (binary + web assets)
└── package.json
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑/↓` or `j/k` | Navigate |
| `Enter` | Select |
| `Space` | Toggle selection |
| `a` | Select all / none |
| `w` | Toggle web server |
| `c` | Copy URL |
| `Escape` | Back |
| `q` | Quit |

## Contributing

- [Contributing Guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)

Uses [Conventional Commits](https://www.conventionalcommits.org/) and [Changesets](https://github.com/changesets/changesets).

## License

[MIT](LICENSE)

---

<p align="center">
  Made with &#10084; by <a href="https://github.com/tux86">tux86</a>
</p>
