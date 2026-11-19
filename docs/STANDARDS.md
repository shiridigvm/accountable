# Engineering Standards

These standards define how we write, review, and maintain code in this repository. Our goal is to keep the code simple, consistent, readable, secure, and easy to maintain.

## 1. Keep Functions Small and Focused

- Each function should have one clear responsibility.
- Prefer small, readable functions over large functions that perform multiple unrelated tasks.
- Extract repeated or complex logic into well-named helper functions when it improves readability.
- Avoid unnecessary abstractions and premature optimisation.
- Use early returns to reduce deeply nested conditionals where appropriate.

## 2. Naming Conventions

- Use descriptive names that explain the purpose of variables, functions, classes, and modules.
- Follow the naming conventions of the language and framework used in the project.
- Prefer clarity over abbreviations or overly short names.
- Use meaningful names for Boolean values, such as `isValid`, `hasPermission`, or `isEnabled`.
- Avoid generic names such as `data`, `value`, or `temp` when a more descriptive name is practical.

## 3. Comments and Documentation

- Write code that is self-explanatory wherever possible.
- Add comments to explain why a decision was made, not simply what the code does.
- Document complex business rules, non-obvious behaviour, and important assumptions.
- Update relevant documentation when behaviour, configuration, or public interfaces change.
- Remove outdated, misleading, or redundant comments.

## 4. Simplicity and Maintainability

- Prefer the simplest solution that meets the current requirements.
- Do not introduce abstractions, dependencies, or design patterns without a clear benefit.
- Follow the existing architecture and conventions unless there is a justified reason to change them.
- Avoid duplicated logic when a shared implementation improves consistency and maintainability.
- Delete unused code rather than leaving it commented out.
- Avoid unrelated changes in a feature or bug-fix commit.

## 5. Error Handling and Reliability

- Handle errors explicitly and at the appropriate level.
- Do not silently ignore errors or use empty catch blocks.
- Provide useful error messages without exposing sensitive information.
- Validate external input at appropriate system boundaries.
- Avoid swallowing exceptions or returning misleading success responses.
- Add tests for error conditions and important edge cases.

## 6. Formatting and Code Quality

- Follow the project's established formatting and linting rules.
- Use automated formatters and linters where available.
- Keep imports organised and remove unused imports and variables.
- Avoid deeply nested logic and unnecessarily complex expressions.
- Use strict type checking where supported by the project.
- Ensure code is readable and consistent with surrounding code.

## 7. Testing

- Add or update tests when introducing features or fixing bugs.
- Test expected behaviour, important edge cases, and failure scenarios.
- Keep tests deterministic, independent, and easy to understand.
- Avoid tests that depend on execution order or external services unless explicitly required.
- Run the relevant test suite before submitting changes.
- Do not disable or weaken tests merely to make a build pass.

## 8. Security and Secrets

- Never commit passwords, API keys, access tokens, private keys, or other secrets.
- Use environment variables or an approved secrets-management solution for sensitive configuration.
- Validate and sanitise untrusted input where appropriate.
- Follow the principle of least privilege when granting access.
- Avoid logging credentials, tokens, personal information, or other sensitive data.
- Address security warnings and dependency vulnerabilities according to project priorities.

## 9. Code Review Standards

- Keep pull requests focused and provide a clear description of the change.
- Review code for correctness, readability, maintainability, security, and test coverage.
- Explain the reasoning behind significant design decisions.
- Provide constructive, respectful, and actionable feedback.
- Reject changes that introduce known defects, expose secrets, or unnecessarily increase complexity.
- Resolve review comments before merging, or explicitly document agreed follow-up work.
- Do not approve changes that you have not adequately reviewed.

## 10. Dependencies and Configuration

- Prefer existing dependencies when they meet the requirements.
- Introduce new dependencies only when the benefits justify their maintenance and security costs.
- Keep dependency versions and configuration consistent with project conventions.
- Do not commit generated files, local configuration, or build artefacts unless required by the project.
- Document new environment variables and configuration options.
- Keep development, testing, and production configuration appropriately separated.

## 11. Git and Change Management

- Use descriptive branch names and commit messages.
- Keep commits focused on a single logical change where practical.
- Do not commit temporary debugging code or unrelated formatting changes.
- Review the final diff before committing or opening a pull request.
- Never rewrite shared history or force-push to protected branches without authorisation.
- Follow the repository's branching, release, and merge policies.

## 12. Definition of Done

A change is ready for review or merge when:

- [ ] The implementation meets the agreed requirements.
- [ ] The code follows these engineering standards.
- [ ] Relevant tests have been added or updated and pass.
- [ ] Formatting, linting, and type checks pass where applicable.
- [ ] No secrets or sensitive information have been introduced.
- [ ] Relevant documentation has been updated.
- [ ] The diff has been reviewed for unrelated changes.
- [ ] Outstanding risks or follow-up work have been communicated.

## Guiding Principle

**Prefer simple, explicit, tested, and maintainable code.**

Delete rather than comment out. Avoid abstractions until they are justified. Make decisions that help the next engineer understand, test, and safely change the code.