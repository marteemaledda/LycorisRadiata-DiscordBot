# GitHub Copilot Instructions

## Project Context
- This is a Discord bot project.
- Follow the existing project structure, architecture, and coding conventions.
- Prioritize readability, maintainability, correctness, and security.

## Coding Guidelines
- Inspect existing code before modifying it.
- Reuse existing code, utilities, and patterns whenever possible.
- Prefer straightforward, readable solutions over unnecessarily clever code.
- Avoid overengineering and unnecessary abstractions.
- Do not refactor unrelated code.
- Do not change existing behavior unless required by the task.
- Avoid adding dependencies unless they are justified.
- Follow the project's existing language, frameworks, and conventions.

## Development Workflow
- Break complex features into smaller steps.
- For complex features, investigate the existing code and propose an implementation plan before coding.
- For straightforward tasks, implement directly.
- Make changes only within the scope of the requested task.
- Write or update tests when appropriate.
- Run relevant tests, builds, or checks after implementation.
- Never claim tests or checks passed unless they were actually run.

## Code Review
- Check implementations for bugs, edge cases, security issues, and unnecessary complexity.
- Consider input validation, error handling, permissions, and concurrency where relevant.
- Prefer minimal fixes over unrelated rewrites.

## Learning
- After completing a complex feature, briefly explain:
  1. What changed.
  2. How it works.
  3. Important design decisions.
  4. Potential edge cases.
  5. Relevant CS concepts I should understand.
- Help me understand data structures, algorithms, APIs, design patterns, and tradeoffs when they are relevant.
- Encourage good software engineering practices without turning every task into a lecture.

## Safety and Git
- Never expose tokens, secrets, credentials, or environment variables.
- Do not commit, push, or perform destructive actions without my explicit approval.
- Ask before performing major architectural changes.
- Preserve existing functionality unless explicitly instructed otherwise.