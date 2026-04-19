# Project Rules

Rules that Antigravity must follow when working on this codebase.

---

## Code Organisation

- **Extract complex logic into hooks / modules.** Component files should stay thin. Setup logic that involves creating instances, connecting providers, or wiring subscriptions must live in a dedicated custom hook (e.g. `useCollaborativeEditor`) — not inline inside a component body.
- **Keep prop drilling shallow.** If a piece of state is consumed by deeply-nested components but owned higher up, move ownership to the layer that actually uses it (e.g. ViewModel) rather than threading it through intermediate props.
- **Co-locate related types with their module.** Interface / type definitions should live next to the code that produces or consumes them — not in a catch-all `types.ts`.

---

## Naming

- **Constants must be self-documenting.** Never use generic names like `COLORS`, `VALUES`, `DATA`, `ITEMS`. If a constant serves a specific purpose, its name must reflect that purpose (e.g. `REMOTE_CURSOR_COLORS`, `SCROLL_X_PADDING`).
- **Files and exports follow established conventions.** Hooks are `use<Name>`, components are `PascalCase`, utilities are `camelCase`. No abbreviations that are ambiguous outside the current file.

---

## Documentation

- **Add `/** */` JSDoc comments to every new exported function, class, interface, and non-obvious constant.** The comment should describe *what* it does and *why*, not restate the name. Skip JSDoc for trivially obvious one-liner getters or single-field interfaces whose name already conveys full meaning.
- **Preserve all existing comments and docstrings** that are unrelated to your code changes, unless the user explicitly asks to remove them.

---

## Styling (React / UI)

- **Use Tailwind CSS for static, structural styling.** Layout, spacing, typography, and colours that don't depend on runtime values go into Tailwind utility classes.
- **Use inline `style` only for truly dynamic values** — positions computed from props/state, user-chosen colours, etc.
- **Use `clsx`** when an element carries both its own semantic className (e.g. `remote-cursor`) and Tailwind utilities. Separate them clearly:
  ```tsx
  className={clsx("remote-cursor", "absolute w-0.5 z-10 pointer-events-none")}
  ```
- **Never mix static CSS-in-JS objects and Tailwind** on the same element. Pick one source of truth per property.

---

## TypeScript

- **Prefer interfaces over type aliases** for object shapes that may be extended or implemented.
- **Prefer `unknown` over `any`.** If a third-party API forces `any`, isolate it to the thinnest wrapper possible and type the public surface.
- **No non-null assertions (`!`) unless guarded by a comment** explaining why the value is guaranteed to exist.

---

## Architecture & Design

- **Program to interfaces, not implementations.** New functionality should accept its dependencies via interface (e.g. `IUndoRedoManager`) so that alternative implementations (solo vs. collaborative) can be swapped without changing consumers.
- **Separation of concerns.** The editor core (`editor/`, `core/`) must never import from the UI layer (`ui/`). Data flows downward through the ViewModel; the UI layer subscribes to changes.
- **Minimise coupling to Yjs in non-collaboration code.** Yjs-specific types and APIs should stay inside `collaboration/` and `EditorState`'s optional constructor args. The solo-mode path must remain functional without Yjs.

---

## Testing

- **Every behaviour-changing PR must include or update tests.** New modules get their own `*.test.ts` file. Bug fixes include a regression test.
- **Tests must be self-contained.** No shared mutable state between test cases. Each `it()` block creates its own fixtures.
- **Run the full test suite (`npx vitest run`) before declaring work complete.** All tests must pass.

---

## Git & Code Review

- **One logical change per commit.** Refactors, new features, and bug fixes should not be mixed in the same commit.
- **No dead code.** Unused imports, commented-out blocks, and orphaned files must be removed before committing.
- **No `console.log` in committed code** unless it is behind a debug flag or is intentional error logging (`console.warn`, `console.error`).
