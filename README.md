# Information

All information about project you can find here (https://github.com/agencik007/beer-catalog-frontend)

## Deploy

A push to `main` (or a manual run of the CI workflow) deploys this service after the build job succeeds. The deploy job calls the Render deploy hook and passes the pushed commit as the `ref` query parameter, so Render builds that commit.

Add the hook URL as a GitHub Actions secret named `RENDER_DEPLOY_HOOK_URL`:

1. Render Dashboard → **beer-catalog-backend** → **Settings** → **Deploy Hook**. Copy the URL. It is a secret; do not commit it.
2. GitHub → this repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
3. Name: `RENDER_DEPLOY_HOOK_URL`. Value: the deploy hook URL.

If the secret is missing, the deploy job fails. A deploy hook request that includes `ref` turns off Render auto-deploy for the service; later production deploys come from this workflow.
