---
trigger: always_on
---

# Documentation

- **Add `/** */` JSDoc comments to every new exported function, class, interface, and non-obvious constant.** The comment should describe *what* it does and *why*, not restate the name. Skip JSDoc for trivially obvious one-liner getters or single-field interfaces whose name already conveys full meaning.

- **Preserve all existing comments and docstrings** that are unrelated to your code changes, unless the user explicitly asks to remove them.
