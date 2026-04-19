---
trigger: always_on
---

# Naming

- **Constants must be self-documenting.** Never use generic names like `COLORS`, `VALUES`, `DATA`, `ITEMS`. If a constant serves a specific purpose, its name must reflect that purpose (e.g. `REMOTE_CURSOR_COLORS`, `SCROLL_X_PADDING`).

- **Files and exports follow established conventions.** Hooks are `use<Name>`, components are `PascalCase`, utilities are `camelCase`. No abbreviations that are ambiguous outside the current file.
