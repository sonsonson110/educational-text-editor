---
trigger: always_on
---

# Styling (React / UI)

- **Use Tailwind CSS for static, structural styling.** Layout, spacing, typography, and colours that don't depend on runtime values go into Tailwind utility classes.
- **Use inline `style` only for truly dynamic values** — positions computed from props/state, user-chosen colours, etc.
- **Use `clsx`** when an element carries both its own semantic className (e.g. `remote-cursor`) and Tailwind utilities. Separate them clearly:

  ```tsx
  className={clsx("remote-cursor", "absolute w-0.5 z-10 pointer-events-none")}
  ```

- **Never mix static CSS-in-JS objects and Tailwind** on the same element. Pick one source of truth per property.
