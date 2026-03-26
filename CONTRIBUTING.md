# Contributing to SSOmatic

Thank you for your interest in contributing! This guide will help you get started.

## Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- AWS CLI configured with SSO profiles (for testing)
- Git

## Development Setup

```bash
git clone https://github.com/tux86/ssomatic.git
cd ssomatic
bun install

# Run CLI
bun run start

# Run web UI (dev mode)
bun run dev

# Lint
bun run lint
```

## Project Structure

```
ssomatic/
├── src/
│   ├── aws/           # Shared AWS credential logic
│   ├── cli/           # Terminal UI (React/Ink) + entry point
│   └── web/
│       ├── server.ts  # Bun HTTP server + RPC bridge
│       └── client/    # Web UI (React/Vite/Tailwind)
├── .github/           # Workflows and templates
└── package.json
```

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Scopes:** `cli`, `web`, `aws`, `deps`, `ci`

Commits are validated by [commitlint](https://commitlint.js.org/) via a Git hook.

## Changesets

After user-facing changes, **always add a changeset**:

```bash
bun run changeset
```

**Bump types:** `patch` (bug fixes), `minor` (new features), `major` (breaking changes)

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes with conventional commits
3. Add a changeset if the change is user-facing
4. Ensure `bun run lint` passes
5. Open a PR using the provided template

## Code Style

- TypeScript strict mode
- React functional components with hooks
- Business logic in `src/aws/sso.ts` (UI-agnostic)
- CLI components use Ink; web components use React/Tailwind

## Building

```bash
bun run build

# Output: dist/ssomatic + dist/web/
```

## Questions?

Open an [issue](https://github.com/tux86/ssomatic/issues) or start a [discussion](https://github.com/tux86/ssomatic/discussions).
