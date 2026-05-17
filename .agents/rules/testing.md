---
trigger: always_on
---

# Client testing

- **Every behaviour-changing PR must include or update tests.** New modules get their own `*.test.ts` file. Bug fixes include a regression test.

- **Tests must be self-contained.** No shared mutable state between test cases. Each `it()` block creates its own fixtures.

- **Run the full test suite (`npx vitest run`) before declaring work complete.** All tests must pass.

# API integration testing

- **Every new Spring Boot controller or feature must include Hurl tests.** Add or update scripts in `packages/api-server/hurl/`.
- **Maintain declarative flows.** If a feature introduces a major user journey step, append it to an existing flow script like `packages/api-server/hurl/flow_basic_room_management.hurl` or create a new declaratively named flow test (e.g., `flow_*.hurl`).
- **Use suffixes for uniqueness.** Always interpolate `{{suffix}}` into test data (like emails) to avoid collisions during repeated E2E test runs.
