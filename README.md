# Amplify App Starter

This repository has been reset from the previous Todo proof of concept to a
clean baseline.

## Current state

- `src/app/page.tsx` is a neutral starter page.
- The demo Todo model and hello REST function have been removed.
- Local build and generated artifacts are ignored so the repo stays cleaner.

## Run locally

```bash
npm run dev
```

## Rebuild the backend when ready

1. Define the Amplify resources you actually need under `amplify/`.
2. Run:
   ```bash
   npm run amplify:sandbox
   ```
3. Wire the generated outputs back into the frontend only after those resources
   exist.
