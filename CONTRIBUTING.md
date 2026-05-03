# Contributing to ReloadPilot

Thanks for your interest in contributing to ReloadPilot!

## Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/mbahnizen/reloadpilot.git
   cd reloadpilot
   ```

2. Open Firefox and go to `about:debugging#/runtime/this-firefox`.

3. Click **Load Temporary Add-on** and select `manifest.json` from the project root.

4. Pin ReloadPilot to the toolbar for easy access.

After editing source files, click **Reload** on the temporary extension entry in `about:debugging` to apply changes.

## Project Structure

```text
background/       Background scheduling logic
popup/            Toolbar popup UI (HTML, CSS, JS)
options/          Backup, restore, and local data info page
icons/            Extension icons at multiple sizes
docs/images/      README screenshots and banner
```

## Linting

ReloadPilot uses Mozilla's `web-ext` tooling for validation:

```bash
npx web-ext lint --self-hosted
```

## Building

```bash
npx web-ext build --overwrite-dest
```

Build output is written to `web-ext-artifacts/`.

## Manual Testing

Before submitting a pull request, please verify your changes against the core flows:

- Set a reload interval on the Current tab and confirm the countdown and badge work.
- Add URLs via Bulk Add and confirm valid/invalid feedback.
- Edit and delete entries from the Managed tab.
- Test Pause All / Resume All.
- Export and import managed URLs from the Options page.

## Submitting Changes

1. Fork the repository and create a feature branch from `main`.
2. Make your changes with clear, descriptive commit messages.
3. Run `npx web-ext lint --self-hosted` and fix any warnings.
4. Open a pull request describing what you changed and why.

## Code Style

- Vanilla JavaScript only — no frameworks or transpilers.
- Use `const` and `let`, never `var`.
- Keep functions small and focused.
- Follow existing naming and formatting conventions.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
