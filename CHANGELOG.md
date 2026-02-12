## [0.2.3](https://github.com/DR-Lars/FlowSync/compare/v0.2.2...v0.2.3) (2026-02-12)


### Bug Fixes

* correct path for dumb-init in Dockerfile ENTRYPOINT ([296a5cd](https://github.com/DR-Lars/FlowSync/commit/296a5cdc0dadc2ad7d6f1f984c0254deb82db0eb))

## [0.2.2](https://github.com/DR-Lars/FlowSync/compare/v0.2.1...v0.2.2) (2026-02-12)


### Bug Fixes

* update build-and-push workflow to fetch latest release tag and adjust metadata extraction ([245cbb1](https://github.com/DR-Lars/FlowSync/commit/245cbb101da6b7b4da6aac67144f58364c184380))

## [0.2.1](https://github.com/DR-Lars/FlowSync/compare/v0.2.0...v0.2.1) (2026-02-12)


### Bug Fixes

* correct dumb-init path from /sbin to /usr/sbin on Alpine ([056bfc8](https://github.com/DR-Lars/FlowSync/commit/056bfc803fdb1a8967c1ffbb90cb9100aaecf9ee))

# [0.2.0](https://github.com/DR-Lars/FlowSync/compare/v0.1.1...v0.2.0) (2026-02-12)


### Features

* add pnpm ([66fabec](https://github.com/DR-Lars/FlowSync/commit/66fabecf8ba11fc77d9fc14712bcf07888f2c3bd))
* implement CI/CD with GitHub Actions and semantic release ([b9a129a](https://github.com/DR-Lars/FlowSync/commit/b9a129a5f03f03f40a315aa780d5f7f9020b90e5))
* upgrade Node.js version to 20 in CI/CD workflow and Dockerfile ([26c39a1](https://github.com/DR-Lars/FlowSync/commit/26c39a1cd2a8e1e6ab5b4aa70889bb35c9176f41))

# Changelog

All notable changes to FlowSync will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Docker-based deployment with multi-architecture support (amd64, arm64, armv7)
- Automatic semantic versioning and changelog generation
- pnpm package manager integration
- GitHub Actions CI/CD workflows

### Changed
- Replaced manual Node.js deployment with Docker containerization
- Removed systemd service file dependency
- Modernized web UI with professional design

### Removed
- Manual deployment script (replaced by Docker)
- Outdated build verification script

## [0.1.0] - 2026-02-12

### Added
- Initial release
- Multi-meter support (up to 3 meters)
- Web-based configuration editor
- Fastify API server
- Local API polling
- Cloud data synchronization
- Docker deployment support
- GitHub Container Registry integration

[Unreleased]: https://github.com/DR-Lars/FlowSync/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/DR-Lars/FlowSync/releases/tag/v0.1.0
