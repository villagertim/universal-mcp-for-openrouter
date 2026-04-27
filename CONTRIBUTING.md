# Contributing to Universal MCP for OpenRouter

Thank you for your interest in contributing! This project thrives on community input, especially when expanding support to various Agentic AI platforms.

## Developer Certificate of Origin (DCO)

To protect the project's licensing and intellectual property, **we enforce the Developer Certificate of Origin (DCO) on all pull requests.** 

By signing off on your commits, you are legally asserting that you are the original creator of the code, that you have the right to submit it under our MIT License, and that the code contains no proprietary or third-party trade secrets. 

To comply, simply add a `Signed-off-by` line to your commit messages:
```text
Signed-off-by: Jane Doe <jane.doe@example.com>
```
*(Tip: Git allows you to do this automatically by using the `-s` flag: `git commit -s -m "your message"`)*

## Development Workflow

1. **Fork & Branch:** Fork the repository and create your feature branch from `main`.
2. **Install:** Run `npm install` to install all dependencies.
3. **Develop:** Make your changes.
4. **Test:** 
   - If you are adding or modifying a profile, refer to `tests/TESTING_GUIDE.md` and run the profile-specific tests (`npx vitest run tests/<profile>/`).
   - Ensure the entire test suite passes by running `npm test`.
5. **Build:** Verify TypeScript compiles cleanly (`npm run build`).
6. **Submit PR:** Submit your Pull Request against the `main` branch.

## Testing Expectations

- **Bug Fixes:** Please include a test that fails without your fix and passes with it.
- **New Profiles:** Must follow the testing protocol outlined in `tests/TESTING_GUIDE.md` and include an updated `README.md` in the profile's test directory.
- **Tools/Features:** Must include mocked unit tests ensuring correct payload construction.
