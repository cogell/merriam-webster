# Agent Instructions

## Project Overview

This is a pnpm monorepo for Merriam-Webster Dictionary API tooling with three packages:

| Package | Description |
|---------|-------------|
| `@merriam-webster/lib` | Core TypeScript client for the Merriam-Webster Dictionary API |
| `@merriam-webster/endpoint` | API endpoint wrapper (depends on lib) |
| `@merriam-webster/skill` | Claude Code skill integration (depends on lib) |

## Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run tests across all packages
pnpm test:run         # Run tests once (no watch)
pnpm typecheck        # Type check all packages
```

## Issue Tracking

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Session Completion

**When ending a work session**, complete ALL steps below. Work is NOT complete until `git push` succeeds.

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - `pnpm test:run && pnpm build`
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE**:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Verify** - All changes committed AND pushed

**CRITICAL**: Work is NOT complete until `git push` succeeds. Never stop before pushing.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
