# Contributing to FlowSync

## Conventional Commits

FlowSync uses [Semantic Versioning](https://semver.org/) and [Conventional Commits](https://www.conventionalcommits.org/) for automatic version management and changelog generation.

### Commit Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature (triggers minor version bump: 1.0.0 → 1.1.0)
- **fix**: A bug fix (triggers patch version bump: 1.0.0 → 1.0.1)
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring without feature changes
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Dependency updates, build configuration, etc.
- **ci**: CI/CD configuration changes

### Breaking Changes

Add `BREAKING CHANGE:` in the footer to trigger a major version bump (1.0.0 → 2.0.0):

```
feat: remove legacy API endpoint

BREAKING CHANGE: The /api/legacy endpoint has been removed. Use /api/v2 instead.
```

### Examples

```
# Feature
feat(docker): add multi-architecture image support

# Bug fix
fix(config): handle missing .env file gracefully

# Documentation
docs: update deployment guide for Docker

# Breaking change
refactor!: redesign configuration structure
```

## Automatic Versioning

When you push commits to `main`, the GitHub Actions workflow automatically:

1. Analyzes commit messages
2. Bumps version in `package.json`
3. Generates/updates `CHANGELOG.md`
4. Creates a git tag (e.g., `v1.2.0`)
5. Creates a GitHub Release
6. Builds and publishes Docker images with the new version tag

## Version Tags in Docker

Images are automatically tagged with:
- `ghcr.io/dr-lars/flowsync:latest` - Latest release
- `ghcr.io/dr-lars/flowsync:v1.2.0` - Specific version
- `ghcr.io/dr-lars/flowsync:main` - Latest main branch
- `ghcr.io/dr-lars/flowsync:sha-abc1234` - Specific commit

## Skipping Release

To skip automatic release for a commit, add `[skip ci]` or `[skip release]` in your commit message:

```
ci: update GitHub Actions workflows [skip ci]
```

## Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes with conventional commits
4. Push to your fork: `git push origin feature/my-feature`
5. Create a Pull Request

## Questions?

Check the main [README.md](./README.md) or [DEPLOYMENT.md](./DEPLOYMENT.md) for more information.
