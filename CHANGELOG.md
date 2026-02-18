# [0.7.0](https://github.com/DR-Lars/FlowSync/compare/v0.6.0...v0.7.0) (2026-02-18)


### Features

* update Docker setup to include env-data directory and permissions management ([2b9e11f](https://github.com/DR-Lars/FlowSync/commit/2b9e11fdfca38aa3a6fa254db11d91dcde084e51))

# [0.6.0](https://github.com/DR-Lars/FlowSync/compare/v0.5.0...v0.6.0) (2026-02-16)


### Features

* add Origin header for CSRF protection in postFormData and enhance logging ([2b44643](https://github.com/DR-Lars/FlowSync/commit/2b44643c5a2f8576fc9fec5d8963f21f9472a98e))

# [0.5.0](https://github.com/DR-Lars/FlowSync/compare/v0.4.2...v0.5.0) (2026-02-16)


### Features

* add debug logging for report posting in ReportPoller ([9de5db7](https://github.com/DR-Lars/FlowSync/commit/9de5db7862030ad539e7d55fe4c4d6ef7f93048c))

## [0.4.2](https://github.com/DR-Lars/FlowSync/compare/v0.4.1...v0.4.2) (2026-02-16)


### Bug Fixes

* use form-data posting for reports in ReportPoller ([7b41d2c](https://github.com/DR-Lars/FlowSync/commit/7b41d2c64d77795ce92a98ee317ecfbc49cf37fa))

## [0.4.1](https://github.com/DR-Lars/FlowSync/compare/v0.4.0...v0.4.1) (2026-02-16)


### Bug Fixes

* enhance batch number extraction logic in ReportPoller ([b706fa1](https://github.com/DR-Lars/FlowSync/commit/b706fa1b6bc45977cafd7a2f16107879813bb8ff))

# [0.4.0](https://github.com/DR-Lars/FlowSync/compare/v0.3.7...v0.4.0) (2026-02-16)


### Bug Fixes

* update comment to clarify extraction of run number from archive name ([113fbb1](https://github.com/DR-Lars/FlowSync/commit/113fbb1a884e7a3b2b64a61b1491b32e04224f47))


### Features

* add report poller configuration and implement report polling functionality ([2dbef00](https://github.com/DR-Lars/FlowSync/commit/2dbef00fe9502314f14b6d94107a2aa8a8357e0b))

## [0.3.7](https://github.com/DR-Lars/FlowSync/compare/v0.3.6...v0.3.7) (2026-02-13)


### Bug Fixes

* extract run number from archive name and update batch tag key references ([0a42a8c](https://github.com/DR-Lars/FlowSync/commit/0a42a8c571b2462ebdf192c55bf7ee10faf30587))

## [0.3.6](https://github.com/DR-Lars/FlowSync/compare/v0.3.5...v0.3.6) (2026-02-13)


### Bug Fixes

* remove hardcoded env vars from compose, let app read from env-data/.env ([ef77e27](https://github.com/DR-Lars/FlowSync/commit/ef77e2734e5aa76d1ab633caf01ddc4eca84dc29))

## [0.3.5](https://github.com/DR-Lars/FlowSync/compare/v0.3.4...v0.3.5) (2026-02-13)


### Bug Fixes

* add detailed logging to config GET endpoint to diagnose parsing issues ([4f9351c](https://github.com/DR-Lars/FlowSync/commit/4f9351c2fab30d231d159d25d3dca4290303c366))

## [0.3.4](https://github.com/DR-Lars/FlowSync/compare/v0.3.3...v0.3.4) (2026-02-13)


### Bug Fixes

* create env-data directory with proper permissions before user switch ([aec8bb6](https://github.com/DR-Lars/FlowSync/commit/aec8bb6317a060b5d2070dd1827d8a8e4d52a5e4))

## [0.3.3](https://github.com/DR-Lars/FlowSync/compare/v0.3.2...v0.3.3) (2026-02-13)


### Bug Fixes

* add JSON parser and improve config editor error handling ([5e01cbf](https://github.com/DR-Lars/FlowSync/commit/5e01cbf9e6376934032409d9909a18b674e29545))

## [0.3.2](https://github.com/DR-Lars/FlowSync/compare/v0.3.1...v0.3.2) (2026-02-13)


### Bug Fixes

* use host network and writable volume for config editor ([68911f8](https://github.com/DR-Lars/FlowSync/commit/68911f8d86ef4edd75a35c733445abfd75e77589))

## [0.3.1](https://github.com/DR-Lars/FlowSync/compare/v0.3.0...v0.3.1) (2026-02-13)


### Bug Fixes

* ensure .env file has correct permissions for web editor ([7778908](https://github.com/DR-Lars/FlowSync/commit/7778908dc0387340bba99011dbc86d1b7ef8953e))

# [0.3.0](https://github.com/DR-Lars/FlowSync/compare/v0.2.3...v0.3.0) (2026-02-13)


### Features

* add support for custom .env file path and update Docker volumes ([8b31f13](https://github.com/DR-Lars/FlowSync/commit/8b31f13fb811e5747080486d22bb276ddca4c50b))

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
