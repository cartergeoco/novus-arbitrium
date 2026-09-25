# Supabase setup for Novus Arbitrium

The browser talks only to this site's `/api/auth/*` and `/api/campaigns` routes. The server uses Supabase Auth for sessions and a private Storage bucket named `campaigns` for saves. Each file is stored as `campaigns/<auth user UUID>/<campaign UUID>.json`; the account can keep five files. No Supabase secret is sent to the browser.

## 1. Project keys

In **Supabase → Project Settings → API Keys**, copy the Project URL and publishable key into the site's server environment as `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Add the secret key as `SUPABASE_SECRET_KEY` in the hosting provider's **secret** settings. These are the only three required app variables. Legacy `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` names remain accepted for older deployments. Never prefix the secret key with `NEXT_PUBLIC_`, paste it into a client component, or commit it.

The secret key is used only for private campaign Storage operations. The Auth routes use the publishable key and a server-managed, HttpOnly session cookie. The bucket is created automatically on the first account save or load; you can also create a **private** bucket named `campaigns` in Storage yourself.

## 2. Email codes

In **Authentication → Sign In / Providers**, enable Email and keep email confirmation enabled. The app never signs someone in from a link. Signup calls `signUp`, password reset calls `resetPasswordForEmail`, and a later sign-in code calls `signInWithOtp`. Each of those sends one of the templates below. The menu then asks for the code and the server calls `verifyOtp`.

In **Authentication → Email Templates**, replace the Confirm signup, Reset password, and Magic Link bodies. Each body must contain `{{ .Token }}` and must not contain `{{ .ConfirmationURL }}`. Leaving the default link in any of those three is what makes the email a link instead of a code.

Confirm signup. Subject: `Your Novus Arbitrium confirmation code`

```html
<h2>Confirm your email</h2>
<p>Enter this code to finish creating your Novus Arbitrium account:</p>
<p>{{ .Token }}</p>
```

Reset password. Subject: `Your Novus Arbitrium password reset code`

```html
<h2>Reset your password</h2>
<p>Enter this code to choose a new password:</p>
<p>{{ .Token }}</p>
```

Magic Link. Subject: `Your Novus Arbitrium sign-in code`

```html
<h2>Sign in</h2>
<p>Enter this code to sign in:</p>
<p>{{ .Token }}</p>
```

For a public site, configure **Authentication → SMTP Settings** with a sender for your domain. Supabase's built-in sender only delivers to preauthorized project-team addresses and has a low project-wide limit. Set SPF, DKIM, and DMARC with the mail provider. Review **Authentication → Rate Limits** before launch. [Supabase email setup](https://supabase.com/docs/guides/auth/auth-smtp) and [OTP guide](https://supabase.com/docs/guides/auth/auth-email-passwordless) have the current dashboard details.

## 3. Google sign-in

In Google Cloud, create a Web OAuth client. Add your site's HTTPS origin as an authorized JavaScript origin. Add the Supabase callback URI shown on **Supabase → Authentication → Sign In / Providers → Google** as Google's authorized redirect URI; it is usually `https://<project-ref>.supabase.co/auth/v1/callback`. Put the Google client ID and client secret into the **Supabase Google provider settings**, not into this app. Enable that provider.

In **Supabase → Authentication → URL Configuration**, set the Site URL to the live domain and allow `https://<your-domain>/auth/callback` as a redirect URL. For local testing, also allow `http://localhost:5173/auth/callback`. The app starts the OAuth flow on the server, exchanges the returned code on `/auth/callback`, and then sends the player to `/`. [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google) explains the provider configuration.

## 4. Reading your data

- **Authentication → Users** shows accounts, confirmation state, provider, and last sign-in. Existing username accounts have an internal `@player.novusarbitrium.app` address. New email and Google users have their real address.
- **Storage → campaigns** shows each user UUID folder and its campaign JSON files. The full game state is inside each file; a private bucket does not make those objects public.
- In **SQL Editor**, this read-only query gives a compact account list:

```sql
select id, email, email_confirmed_at, last_sign_in_at,
       raw_app_meta_data ->> 'provider' as provider,
       raw_user_meta_data ->> 'username' as legacy_username
from auth.users
order by created_at desc;
```

Use the user UUID from this list to locate their Storage folder. The app has no public campaigns table; the JSON files remain the source of truth. Do not edit a save directly in the dashboard while a player is using it.

For a single readable campaign index, run [`supabase/migrations/0001_developer_campaign_overview.sql`](../supabase/migrations/0001_developer_campaign_overview.sql) once in SQL Editor, then query `select * from developer.campaign_overview order by updated_at desc;`. It joins private Storage metadata to account email and name. The `developer` schema is not granted to app roles; it is for the dashboard's SQL Editor only. The view does not copy campaign content or replace the private JSON files.
