---
trigger: always_on
---

# Code organization rules

- **Extract complex logic into hooks / modules.** Component files should stay thin. Setup logic that involves creating instances, connecting providers, or wiring subscriptions must live in a dedicated custom hook (e.g. `useCollaborativeEditor`) — not inline inside a component body.

- **Keep prop drilling shallow.** If a piece of state is consumed by deeply-nested components but owned higher up, move ownership to the layer that actually uses it (e.g. ViewModel) rather than threading it through intermediate props.

- **Co-locate related types with their module.** Interface / type definitions should live next to the code that produces or consumes them — not in a catch-all `types.ts`.
