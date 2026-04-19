---
trigger: always_on
---

# TypeScript

- **Prefer interfaces over type aliases** for object shapes that may be extended or implemented.
- **Prefer `unknown` over `any`.** If a third-party API forces `any`, isolate it to the thinnest wrapper possible and type the public surface.
- **No non-null assertions (`!`) unless guarded by a comment** explaining why the value is guaranteed to exist.
