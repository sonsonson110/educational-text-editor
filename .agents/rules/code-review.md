---
trigger: always_on
---

# Git & Code Review

- **One logical change per commit.** Refactors, new features, and bug fixes should not be mixed in the same commit.
- **No dead code.** Unused imports, commented-out blocks, and orphaned files must be removed before committing.
- **No `console.log` in committed code** unless it is behind a debug flag or is intentional error logging (`console.warn`, `console.error`).
