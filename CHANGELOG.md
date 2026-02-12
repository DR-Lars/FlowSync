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
