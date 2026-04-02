# Amplify Gen 2 + Next.js MVP

This project was scaffolded from scratch based on your runbook:
- Next.js (TypeScript, App Router)
- Amplify Gen 2 backend
- GraphQL `Todo` model
- REST `GET /hello` Lambda
- Frontend wired to `amplify_outputs.json`

## What is already done

- Backend files created under `amplify/`
- Frontend page wired in `src/app/page.tsx`
- npm scripts configured:
  - `npm run dev`
  - `npm run amplify:sandbox`

## First run

1. Login with AWS SSO:
   ```bash
   aws sso login --profile Kalpana
   export AWS_PROFILE=Kalpana
   aws sts get-caller-identity
   ```

2. Start Amplify sandbox in terminal A:
   ```bash
   npm run amplify:sandbox
   ```

3. Start Next.js app in terminal B:
   ```bash
   npm run dev
   ```

4. Open the app and verify:
   - REST response appears from `/hello`
   - Create at least 2 todos
   - Refresh and confirm todos persist

## Notes

- `amplify_outputs.json` is included as a placeholder and will be overwritten by sandbox deployment.
- If port 3000 is busy, run:
  ```bash
  npx next dev -p 3001
  ```
