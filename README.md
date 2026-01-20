# (WIP) Monarch Money API (TypeScript)

An unofficial TypeScript client for the Monarch Money API with comprehensive type definitions and modern development tools.

## What makes this library unique?

This library is built using an **AI-assisted agent workflow**. Instead of reverse-engineering APIs manually, users collect real traffic logs from Monarch Money using the provided browser extension. An AI assistant then analyzes these captured requests and responses to build, integrate, and validate the API schemas and client code. This approach ensures the TypeScript types accurately reflect the actual API behavior observed in production, and allows rapid iteration as the API evolves.

- [Traffic Recorder Extension](./traffic-recorder-extension/README.md) — Capture GraphQL traffic from Monarch Money
- [Traffic Analyzer Tool](./mmtraf.md) — Analyze and explore captured traffic logs


## TODO till first version release

- [ ] complete this readme
- [ ] publish the first version to npm

## Versioning and publishing

Manual versioning with GitHub CI publishing:

1. Bump version and create tag locally:
   - `npm version patch` (or `minor` / `major`)
2. Push commit and tag:
   - `git push --follow-tags`
3. GitHub Actions publishes on `v*` tags.

Setup notes:
- Remove `"private": true` from `package.json` before publishing.
- Add `NPM_TOKEN` as a repository secret for the publish workflow.
 
