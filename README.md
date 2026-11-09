# Information

All information about project you can find here (https://github.com/agencik007/beer-catalog-frontend)

## Authentication (Better Auth)

Authentication is handled by [Better Auth](https://www.better-auth.com) mounted at `/api/auth/*`, with users stored in MongoDB (`user`, `account`, `session`, `verification` collections).

- Email + password with required email verification
- Password reset by email
- OAuth: Google and GitHub (enabled when the client ID/secret env vars are set)
- Roles via the `admin` plugin (`user` / `admin`). Admins can edit and delete any beer.
- Sessions are sent as a **Bearer token** (`Authorization: Bearer <token>`). Multiple sessions per user are supported.

Configuration: see `.env.example`.

### Endpoint migration (old → new)

| Old endpoint | New endpoint |
|---|---|
| `POST /api/users/register` | `POST /api/auth/sign-up/email` `{ name, email, password, callbackURL? }` |
| `POST /api/users/login` | `POST /api/auth/sign-in/email` `{ email, password }`. Token in the `set-auth-token` response header. |
| `POST /api/users/logout` | `POST /api/auth/sign-out` |
| `GET /api/users/me` | `GET /api/auth/get-session` |
| n/a | `POST /api/auth/request-password-reset` `{ email, redirectTo }` |
| n/a | `POST /api/auth/reset-password` `{ newPassword, token }` |
| n/a | `POST /api/auth/send-verification-email` `{ email, callbackURL? }` |
| n/a | `POST /api/auth/sign-in/social` `{ provider: "google" \| "github", callbackURL }` |
| n/a | `/api/auth/admin/*` (list-users, set-role, ban-user, …) for admins |

### Frontend usage

```ts
import { createAuthClient } from 'better-auth/client';
import { adminClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
	baseURL: 'https://<backend-host>',
	plugins: [adminClient()],
	fetchOptions: {
		onSuccess: (ctx) => {
			const token = ctx.response.headers.get('set-auth-token');
			if (token) localStorage.setItem('bearer_token', token);
		},
		auth: {
			type: 'Bearer',
			token: () => localStorage.getItem('bearer_token') || '',
		},
	},
});
```

Protected beer endpoints (`/api/beers/userbeers`, `POST/PUT/DELETE /api/beers`) expect `Authorization: Bearer <token>`.

OAuth callback URLs to register with the providers:
`${BETTER_AUTH_URL}/api/auth/callback/google` and `${BETTER_AUTH_URL}/api/auth/callback/github`.
The OAuth callback creates the session as a cookie on the backend domain (in production: `SameSite=None; Secure`). After the redirect back to the frontend, call `authClient.getSession({ fetchOptions: { credentials: 'include' } })` once and store `data.session.token` as the bearer token.

### Email (Brevo)

1. Brevo → **Senders, Domains & Dedicated IPs** → add and verify the sender address (or authenticate your domain for better deliverability).
2. Brevo → **SMTP & API** → **API Keys** → generate a key.
3. Set `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS` (the verified sender) and optionally `EMAIL_FROM_NAME`.

Without `BREVO_API_KEY` the links are printed to the console in development; in production sending fails loudly.

### OAuth apps

- **Google**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create credentials → OAuth client ID → *Web application*.
  Authorized redirect URI: `${BETTER_AUTH_URL}/api/auth/callback/google` (e.g. `http://localhost:5000/api/auth/callback/google`; add the production URL too).
  Configure the OAuth consent screen first; in *Testing* mode only listed test users can sign in.
- **GitHub**: [Developer settings → OAuth Apps](https://github.com/settings/developers) → New OAuth App.
  Homepage URL: the frontend URL. Authorization callback URL: `${BETTER_AUTH_URL}/api/auth/callback/github`.
  A GitHub OAuth App has a single callback URL, so create one app for local development and one for production.
- Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and/or `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`, and on the frontend `VITE_AUTH_PROVIDERS=google,github`.

### Scripts

- `npm run migrate:users -- --dry-run`, then `npm run migrate:users`: copies accounts from the legacy `users` collection into Better Auth (same ids, same passwords). Emails are marked as **not verified**: on the first sign-in attempt the user gets a verification email, then the old password works. Review migrated admins manually. Idempotent; the legacy collection is kept as a backup.
- `npm run set-admin -- <email> [--revoke]`: grants or revokes the admin role.

### Deployment (Render)

1. Set the new env vars (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGINS`, `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`, OAuth keys, `MONGO_TRANSACTIONS=true` on Atlas) and remove `JWT_SECRET` / `ADMIN_EMAIL`.
2. Deploy, then run `npm run migrate:users` once against the production database.

## Deploy

A push to `main` (or a manual run of the CI workflow) deploys this service after the build job succeeds. The deploy job calls the Render deploy hook and passes the pushed commit as the `ref` query parameter, so Render builds that commit.

Add the hook URL as a GitHub Actions secret named `RENDER_DEPLOY_HOOK_URL`:

1. Render Dashboard → **beer-catalog-backend** → **Settings** → **Deploy Hook**. Copy the URL. It is a secret; do not commit it.
2. GitHub → this repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
3. Name: `RENDER_DEPLOY_HOOK_URL`. Value: the deploy hook URL.

If the secret is missing, the deploy job fails. A deploy hook request that includes `ref` turns off Render auto-deploy for the service; later production deploys come from this workflow.
