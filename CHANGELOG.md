# Changelog

## 1.2.2 - 2026-08-25

- Fixed eslint warning on Obsidian community [plugin page](https://community.obsidian.md/account/plugins/anything-as-md):
```
Unsafe assignment of an error or any typed value
@typescript-eslint/no-unsafe-assignment
```

## 1.2.1 - 2026-08-25 _(no release)_

- Fixed description error

## 1.2.0 - 2026-08-25 _(no release)_

- Migrated settings to [declarative API](https://docs.obsidian.md/plugins/guides/migrate-declarative-settings)
- Bumped minimum Obsidian version to 1.13.0 (for declarative settings API), bumped plugin to next minor version
- New-style settings row for intially-hidden reload hint
- Bumped `eslint-plugin-obsidianmd` to `^0.4.2`
- Added artefact attestations for plugin page Scorecard
- Added `prettier`
- Description rewording

## 1.1.2 - 2026-06-01

- [Obsidian Scorecard](https://community.obsidian.md/account/plugins/anything-as-md) fixes and ESLint updates
- README.md title changed to match the plugin listing
- Added CHANGELOG.md
- Changed `release.yml` to pass in tag to the workflow, and grab content from CHANGELOG.md
- License change
- Added plugin test code

## 1.1.1 - 2026-03-14

- ObsidianReviewBot lint fixes

## 1.1.0 - 2026-03-14 _(no release)_

- Configurable file-extension label (override)
- Force Obsidian indexing/caching
- Documentation and description updates

## 1.0.0 - 2026-02-23

- Initial release: register any file extension as Markdown - user-configurable in settings
