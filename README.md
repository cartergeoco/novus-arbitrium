# Novus Arbitrium

A browser history game. Choose a country, make decisions, and follow an alternate-history campaign. Turns can be resolved by a configured public AI provider or by the built-in local rules.

Game source is **GPL-3.0-only**. See [LICENSE](LICENSE). Third-party libraries and assets keep their own licenses. Creator: Carter Geoco.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

Open the local URL printed by the dev server.

```sh
npm test
npm run typecheck
npm run build
npm start
```

`npm test` checks simulation, flag, and provider invariants. `npm run build` produces the production build; `npm start` serves it locally.

API keys stay in the browser tab. The app forwards them only through its own server routes to the provider you choose. Do not commit `.env` files, tunnel credentials, or hosting configuration.

## Play

- Start a campaign from the world map. Search, pan, zoom, and identify countries.
- Campaigns are saved in IndexedDB on this device. Export and import validated JSON. Deleting a campaign asks for confirmation.
- Set the time step and difficulty, issue decisions, and read the chronicle.
- Edit national identity, including a layered SVG flag. Official country flags are the MIT-licensed ISO 3166-1 SVGs from iso3166-flags. Custom and successor flags are drawn by the in-app flag engine.
- Draw a polygon to cut or transfer territory. New polities receive a derived flag and identity. Undo is available until the next turn.
- Firestorm v2.0 adds persistent wars, occupation pressure, suzerainty, four region types, unheld land, and map/timeline filters. Existing version-1 campaigns are upgraded in place when opened.

## Flags

The flag creator uses a 2:1 canvas and three layer kinds: shapes, procedural divisions, and emblems. Designs are structured data. The same library is used by the player and by the model, which returns component ids and parameters rather than drawing the SVG itself.

Emblem artwork comes from reusable open licenses:

- [Game-icons.net](https://game-icons.net/) — CC BY 3.0
- [Material Design Icons](https://pictogrammers.com/library/mdi/) — Apache-2.0
- [Font Awesome Free](https://fontawesome.com/license/free) — CC BY 4.0
- [iso3166-flags](https://github.com/amckenna41/iso3166-flags) — MIT (ISO 3166-1 country flags and ISO 3166-2 subdivision flags). Regional images use the repository's CDN paths; a region has no flag where that dataset has no matching asset. Regenerate the mapping with `npm run flag:regions`.
- [flag-icons](https://github.com/lipis/flag-icons) — MIT (emblem artwork)

Regenerate the emblem index with `npm run flag:assets` after installing dependencies. `npm run flag` renders, describes, and lists catalog entries from the command line.

## Accounts

New accounts use a confirmation code sent to a real email address or Google sign-in. Older username/password accounts can still sign in from the account menu; new synthetic-email accounts are no longer created. Account campaigns live in a private Supabase Storage bucket, scoped to the authenticated user and limited to five saves. See [Supabase setup](docs/SUPABASE.md) for the three environment values, email template, Google callback, storage layout, and developer inspection queries. The built-in Supabase email sender is for development; a custom SMTP provider is required for public email delivery.

## Browser and abuse protection

Sign-in, account saves, and AI routes require a recent Cloudflare Turnstile Invisible check once it is configured. The server verifies the token with Cloudflare, checks its hostname and action, then issues a signed, HttpOnly cookie valid for 20 minutes. The secret key never goes to the browser. With no Turnstile values set, those routes stay available. See [browser security setup](docs/BROWSER_SECURITY.md) for the three deployment variables and edge rate-limit guidance. Turnstile reduces automated abuse but does not establish a person's identity or stop network-level DDoS traffic on its own.

## Models

Settings → API chooses among OpenRouter, OpenAI, Claude (Anthropic), Google Gemini, Groq, Mistral AI, Grok (xAI), DeepSeek, Together AI, Cohere, and Cerebras. Enter an API key from the selected provider and a model ID. The server checks model access and sends turns and flag requests to that provider. Keys stay in browser tab memory, separately for each provider; they are not saved or exported.

For a public domain, redirect HTTP to HTTPS and rate-limit `/api/provider`, `/api/turn`, and `/api/flag` at the edge for your expected traffic. The app rejects cross-site and oversized requests, but in-process limits cannot reliably cover every Worker instance.

The token figure in a campaign is provider usage plus a conservative estimate. It is not a spending cap. Set spending limits in the provider account. A rejected request can still be billed by the provider.

## Limits

- Map geometry is Natural Earth 5.1.2, a generalized baseline, not a current political-boundary authority. Scenario time starts on 1 January 2026.
- Population and GDP keep their source years. Missing values stay unknown. Territorial splits allocate them by area.
- Stability, economy, influence, relations, and priorities are simulation seeds.
- There is no cloud save, multiplayer, live news feed, or 3D globe. The chronicle records game events only.

## Sources

- [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/), public domain. Pinned at [v5.1.2](https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2). Regenerate with `node scripts/prepare-world.mjs`.
- [Leaflet](https://leafletjs.com/) (BSD-2-Clause), [Geoman](https://github.com/geoman-io/leaflet-geoman) (MIT), [Turf](https://turfjs.org/) (MIT).
- [Phosphor](https://phosphoricons.com/) (MIT). Poppins and IBM Plex Mono via Fontsource (SIL Open Font License).
- React, Vinext, Zod, and idb-keyval.
