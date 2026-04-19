---
trigger: always_on
---

# Testing

- **Every behaviour-changing PR must include or update tests.** New modules get their own `*.test.ts` file. Bug fixes include a regression test.
- **Tests must be self-contained.** No shared mutable state between test cases. Each `it()` block creates its own fixtures.
- **Run the full test suite (`npx vitest run`) before declaring work complete.** All tests must pass.
