# Repository Guidelines

## Project Structure & Module Organization

This repository contains a working Next.js App Router application alongside its planning documentation. Keep planning notes in `docs/`; `docs/01_codex_cli_development_guide.md` defines the v0.1 scope and `docs/03_youtube_url_learning_design.md` defines the local YouTube learning workflow. Use `app/` for routes, `components/` for reusable UI, `lib/` for parsing, validation, and browser-storage modules, `content/` for reviewed MDX or JSON, `e2e/` for Playwright tests, and colocated `*.test.ts` or `*.test.tsx` files for Vitest tests. Store static assets in `public/`.

## Build, Test, and Development Commands

Run commands from the repository root. The available commands are:

- `npm run dev` — start the local development server.
- `npm run lint` — run the configured linter.
- `npm run typecheck` — validate TypeScript without emitting files.
- `npm test` — run the configured test suite.
- `npm run test:e2e` — run Playwright browser tests.
- `npm run build -- --webpack` — verify a production build with webpack.

Install dependencies with `npm ci` and install the local E2E browser once with `npx playwright install chromium`. Do not claim that checks pass unless the corresponding command was run successfully in the current workspace.

## Coding Style & Naming Conventions

Use TypeScript with two-space indentation. Name React components and their files in PascalCase (for example, `VideoSegment.tsx`), functions and variables in camelCase, and route folders in lowercase kebab-case. Keep components focused and favor explicit typed props. Treat prompts and code samples as inert text; never execute arbitrary HTML, JSX, or external scripts from content. Use the formatter and linter configured by the future scaffold rather than introducing competing tools.

## Testing Guidelines

Add unit and component tests alongside new behavior and name them `*.test.ts` or `*.test.tsx`. Put browser journeys in `e2e/` and name them `*.spec.ts`. Prioritize content validation, valid non-overlapping video segments, copy-only behavior, browser-storage persistence, backup restoration, and responsive rendering at 360px. Before submitting application changes, run lint, type checking, unit tests, the production build, and Playwright E2E tests. Document any unavailable check in the PR.

## Commit & Pull Request Guidelines

History currently uses Conventional Commits (`chore: initialize repository`); continue with prefixes such as `feat:`, `fix:`, `docs:`, and `test:`. Keep each commit scoped to one logical change. PRs should summarize the change, list verification commands and results, link relevant issues, and call out remaining TODOs or risks. Include before/after screenshots for visible UI changes, especially mobile layouts.

## Security & Content Integrity

Never commit secrets or `.env*` files. Do not invent video metadata, summaries, timestamps, or sources; mark unverified information as TODO. Keep v0.1 free of databases, authentication, external APIs, and automatic collection unless the project scope is explicitly revised.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
