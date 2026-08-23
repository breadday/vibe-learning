# Repository Guidelines

## Project Structure & Module Organization

This repository is documentation-first. Keep planning notes in `docs/`; `docs/01_codex_cli_development_guide.md` defines the v0.1 scope. The planned application uses Next.js App Router, TypeScript, Tailwind CSS, and curated MDX. When implementation begins, prefer `app/` for routes, `components/` for reusable UI, `content/` for reviewed MDX or JSON, and colocated tests or `tests/`. Store static assets in `public/`.

## Build, Test, and Development Commands

There is no `package.json` or runnable application yet. Do not claim that checks pass until the scaffold and scripts exist. After the planned Next.js setup, expose and use these conventional commands:

- `npm run dev` — start the local development server.
- `npm run lint` — run the configured linter.
- `npm run typecheck` — validate TypeScript without emitting files.
- `npm test` — run the configured test suite.
- `npm run build` — verify a production build.

Run commands from the repository root and update this guide if script names differ.

## Coding Style & Naming Conventions

Use TypeScript with two-space indentation. Name React components and their files in PascalCase (for example, `VideoSegment.tsx`), functions and variables in camelCase, and route folders in lowercase kebab-case. Keep components focused and favor explicit typed props. Treat prompts and code samples as inert text; never execute arbitrary HTML, JSX, or external scripts from content. Use the formatter and linter configured by the future scaffold rather than introducing competing tools.

## Testing Guidelines

Add tests alongside new behavior and name them `*.test.ts` or `*.test.tsx`. Prioritize content validation, valid non-overlapping video segments, copy-only behavior, and responsive rendering at 360px. Before submitting application changes, run lint, type checking, tests, and the production build. Document any unavailable check in the PR.

## Commit & Pull Request Guidelines

History currently uses Conventional Commits (`chore: initialize repository`); continue with prefixes such as `feat:`, `fix:`, `docs:`, and `test:`. Keep each commit scoped to one logical change. PRs should summarize the change, list verification commands and results, link relevant issues, and call out remaining TODOs or risks. Include before/after screenshots for visible UI changes, especially mobile layouts.

## Security & Content Integrity

Never commit secrets or `.env*` files. Do not invent video metadata, summaries, timestamps, or sources; mark unverified information as TODO. Keep v0.1 free of databases, authentication, external APIs, and automatic collection unless the project scope is explicitly revised.
