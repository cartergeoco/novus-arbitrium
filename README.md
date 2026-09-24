# Novus Arbitrium · alpha 0.1

A first playable browser alpha based on the supplied Novus Arbitrium brief. Lead a country, issue decisions, and follow an alternate-history timeline. The default engine is a **local, rule-based demo**, not AI. OpenAI and OpenRouter can be configured in Settings → API for AI turns.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

Use the Local URL printed by the server. `npm run build` creates the Cloudflare Workers deployment; `npm start` serves the production build locally. `npm run typecheck` and `npm test` check types and simulation invariants.

## Included

- Campaign creation and selection among 241 countries and territories, search, pan/zoom, hover identification, four map views.
- IndexedDB campaign saves on this device; validated JSON export/import; campaign deletion confirmation.
- Decisions, configurable time steps and difficulty, bounded stat changes, international reactions, chronicle, and dissolution/unification conditions.
- Real country geometry and 4,596 source administrative regions, with region maps downloaded only for the selected nation.
- Freeform territorial cuts and transfers. Draw a polygon with Geoman; Turf intersects it with the source land and subtracts/merges geometry. New nations get vector flags and identities. Undo is available until the next turn.
- National identity editor and compositional SVG flag generator. Existing flags use the open-source `flag-icons` vector collection. No image-generation service is used.
- Settings for generation, API, appearance, audio and help. Poppins, IBM Plex Mono and Phosphor icons follow the brief.
- API endpoint with fixed provider destinations, same-origin checks, timeout, input/output validation and no stored API keys. Keys are held only in tab memory, sent through the site server on a turn, and forwarded to the chosen provider.

## AI context and operations

`lib/game.ts` builds a compact context containing the player, explicitly mentioned and nearby nations (a configurable limit), up to 60 relevant region records and four recent events. Routine prompts omit full polygon coordinates. The engine receives a documented JSON contract and can return bounded country effects, headlines, identity changes for non-player nations, and rare territorial masks. Changes are validated and applied atomically. Player identity cannot be overwritten by the model.

The token budget is a preflight estimate plus reported provider usage, **not a monetary cap**. Set provider-side spending limits where needed. Requests rejected by the provider can still incur provider charges. Choose a model with JSON output support. No live paid AI request was made during development; the API adapter is verified with mocked provider responses.

## Deliberate alpha limits

- Natural Earth 5.1.2 is a generalized geographic baseline, not an authoritative September 2026 political boundary dataset. Scenario time begins 1 January 2026.
- Population and GDP retain their source reference years (mostly 2019). Missing values display as unknown. Territorial population/GDP allocation uses area ratios, not a population grid.
- Stability, economy, influence, relations and national priorities are simulation seeds, not researched political facts. Province names, types and geography are included; detailed demographics, beliefs, flags and region-level persistence remain future work.
- New-state province ownership and automatic region reassignment are not yet modeled. Non-player nation identity changes, borders and decisions are supported by the AI contract; local demo turns recognize broad policy categories and do not simulate sophisticated wars.
- No 3D globe, cloud save sync, multiplayer, independent real-time agent loop, stock market, or live-news feed. The chronicle reports game events only.
- Geography across the antimeridian should be edited with small local masks; complex globe-spanning masks need further validation.

## Reused foundations and sources

Research was completed before choosing the map stack. Leaflet + Geoman + Turf fits Earth-based editable geometry; Azgaar was considered, but its complete fantasy-world application is a less direct fit for this real-world alpha.

- [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/): public-domain country and province geometry. [Pinned source v5.1.2](https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2). Regenerate with `node scripts/prepare-world.mjs`.
- [Leaflet](https://leafletjs.com/): interactive map, BSD-2-Clause.
- [Leaflet Geoman Free](https://github.com/geoman-io/leaflet-geoman): drawing tools, MIT.
- [Turf](https://turfjs.org/docs/api/difference): polygon operations, MIT.
- [flag-icons](https://github.com/lipis/flag-icons): existing national SVG flags, MIT.
- [Phosphor](https://phosphoricons.com/): interface icons, MIT.
- Poppins and IBM Plex Mono via Fontsource: SIL Open Font License.
- React, Vinext, Zod, idb-keyval and the bundled Shadcn/Radix components provide rendering, validation, storage and accessible controls.
- [OpenAI chat API](https://developers.openai.com/api/reference/resources/chat) and [OpenRouter chat API](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion).
- [Azgaar map generator](https://github.com/Azgaar/Fantasy-Map-Generator): researched alternative, not embedded.

Game source license: **GPL-3.0-only**, as specified in the brief. Third-party libraries and assets retain their own licenses. Creator: Carter Geoco. The upstream repository link in Help is project information; this work does not push to that GitHub repository.
