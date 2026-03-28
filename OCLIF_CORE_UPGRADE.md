# @oclif/core Dependency Upgrade from v1 to v2

## Summary
The `@oclif/core` dependency was upgraded from version 1.x to version 2.x in the following commit and pull request.

## Commit Details
- **Commit SHA**: `1d3dfbed92747bbe4e4964c4da240b18e1674576`
- **Commit Message**: "build(deps): bump @oclif/core from 1.26.2 to 2.8.11 (#692)"
- **Date**: July 14, 2023 at 09:07:31 +0800
- **Author**: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>
- **Co-authored-by**: Shazron Abdullah <36107+shazron@users.noreply.github.com>

## Pull Request Details
- **PR Number**: #692
- **PR Title**: "build(deps): bump @oclif/core from 1.26.2 to 2.8.11"
- **PR URL**: https://github.com/adobe/aio-cli-plugin-app/pull/692
- **Status**: Merged
- **Merged Date**: July 14, 2023 at 01:07:31 UTC
- **Merged By**: shazron (Shazron Abdullah)

## Version Change in package.json
The actual change made in the package.json file:
- **From**: `"@oclif/core": "^1.15.0"`
- **To**: `"@oclif/core": "2.8.12"`

Note: The commit message references versions 1.26.2 → 2.8.11, which represent the actual installed versions at the time (from package-lock.json), while the package.json specified `^1.15.0` and was updated to `2.8.12`. The version was later updated to `^2.11.6` in subsequent commits.

## Description
This was a major version upgrade (semver-major) from version 1 to version 2 of the @oclif/core package. The upgrade was initially created by Dependabot but required manual fixes to address breaking changes and test failures.

The PR included:
- 4 commits in total
- 167 additions and 157 deletions
- 54 files changed
- Updates to multiple command files and test files to accommodate breaking changes in @oclif/core v2

## Additional Dependencies Added
Along with the @oclif/core upgrade, the following dependencies were also added:
- `node-abort-controller`: `^3.1.1`
- `open`: `^8.4.2`

## Notes
The upgrade required significant code changes across the codebase to adapt to breaking changes introduced in @oclif/core v2. The PR description mentions that there were "29 failures in run.test.js" that needed to be fixed during the upgrade process.
