[2.0.0] - 2026-01-17

### Changed

## BREAKING: Upgraded to Discord.js v14

- Updated all interaction handlers to use v14 API
- Fixed type narrowing issues with guild checks
- Updated permission system for v14 compatibility
- Enhanced TypeScript type safety

## Fixed

- Fixed TypeScript compilation errors with type narrowing
- Fixed FAQ remove command interaction handling
- Fixed permission middleware type guards
- Resolved avatar resolution to use maximum 4096px
- Fixed safeReply type compatibility issues

## Technical

- Updated to Discord.js v14.16.3
- Improved TypeScript strict mode compliance
- Enhanced error handling in FAQ subcommands
- Better type safety across permission checks

## Unreleased

- Added
  - Playback and pagination commands
  - Timezone commands (save, show, clear, compare)
  - Centralized structured logging
  - Initial changelog tracking
