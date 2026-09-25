# Novus Arbitrium

A browser history game. Choose a country, make decisions, and follow an alternate-history campaign. Turns can be resolved by a configured language model (OpenAI, OpenRouter, or a local Ollama server) or by the built-in local rules.

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
- Edit national identity, including a layered SVG flag. Official country flags use the MIT-licensed `flag-icons` set. Custom and successor flags are drawn by the in-app flag engine.
- Draw a polygon to cut or transfer territory. New polities receive a derived flag and identity. Undo is available until the next turn.

## Flags

The flag creator uses a 2:1 canvas and three layer kinds: shapes, procedural divisions, and emblems. Designs are structured data. The same library is used by the player and by the model, which returns component ids and parameters rather than drawing the SVG itself.

Emblem artwork comes from reusable open licenses:

- [Game-icons.net](https://game-icons.net/) — CC BY 3.0
- [Material Design Icons](https://pictogrammers.com/library/mdi/) — Apache-2.0
- [Font Awesome Free](https://fontawesome.com/license/free) — CC BY 4.0
- [flag-icons](https://github.com/lipis/flag-icons) — MIT

Regenerate the emblem index with `npm run flag:assets` after installing dependencies. `npm run flag` renders, describes, and lists catalog entries from the command line.

## Models

Settings → API chooses the provider, model, and generation limits. The browser never talks to Ollama. The server does. Locally that is `127.0.0.1:11434`. OpenAI and OpenRouter requests use the key held in tab memory.

A deployed site can reach Ollama on your computer through a stable private HTTPS address. Cloudflare quick tunnels are not used: their `trycloudflare.com` hostname changes every time the process restarts. This project uses [Tailscale Funnel](https://tailscale.com/kb/1223/funnel), whose `*.ts.net` name stays the same across restarts.

On the computer running Ollama:

```sh
# .env.ollama.local is gitignored. Set OLLAMA_TOKEN to a long random value.
npm run ollama:gateway
tailscale funnel --bg --set-path=/novus-ollama 11435
```

The gateway listens on `127.0.0.1:11435`, checks `Authorization: Bearer`, and forwards only `/api/` requests to Ollama. Funnel publishes that path. Port `11434` stays closed. Use a path so this does not replace other services on the same Tailscale hostname.

On the host that runs the website, set `OLLAMA_BASE_URL` to `https://<machine>.<tailnet>.ts.net/novus-ollama` and `OLLAMA_TOKEN` to the same value. See `.env.example`. Turn responses are JSON, not a token stream; the gateway still forwards a response body as it arrives.

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
