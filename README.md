# (WIP) Monarch Money API (TypeScript)

An unofficial TypeScript client for the Monarch Money API with comprehensive type definitions and modern development tools.

- [Traffic Recorder Extension](./packages/monarch-money-ts/traffic-recorder-extension/README.md)
- [Traffic Analyzer Tool](./mmtraf.md)


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
 
