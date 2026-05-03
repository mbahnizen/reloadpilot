# Changelog

All notable changes to ReloadPilot are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/).

## [1.2.0] – 2026-05-03

### Added

- Pause All / Resume All global control.
- Export managed URLs as a local JSON backup.
- Import a ReloadPilot JSON backup to merge schedules.
- Options page with backup, restore, and privacy info.
- Inline interval editing for managed URLs.
- Manual test checklist for pre-release verification.

### Changed

- Migrated to page-native `location.reload()` via the scripting API.
- Badge countdown limited to the final 5 seconds before each reload.
- Removed content script injection entirely for zero page overhead.

## [1.0.0] – Initial Release

### Added

- Per-URL reload scheduling in seconds, minutes, or hours.
- Strict URL matching for predictable behavior.
- Bulk URL entry with live validation feedback.
- Persistent storage across browser restarts.
- Toolbar badge countdown before reload.
- Dark blue/cyan popup UI.
