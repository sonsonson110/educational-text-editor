---
trigger: always_on
---

# Architecture & Design

- **Program to interfaces, not implementations.** New functionality should accept its dependencies via interface (e.g. `IUndoRedoManager`) so that alternative implementations (solo vs. collaborative) can be swapped without changing consumers.
- **Separation of concerns.** The editor core (`editor/`, `core/`) must never import from the UI layer (`ui/`). Data flows downward through the ViewModel; the UI layer subscribes to changes.
- **Minimise coupling to Yjs in non-collaboration code.** Yjs-specific types and APIs should stay inside `collaboration/` and `EditorState`'s optional constructor args. The solo-mode path must remain functional without Yjs.
