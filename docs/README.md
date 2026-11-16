# Casper Deployer

Angular + NestJS + Nx app for querying and submitting work to the **Casper 2.x** network, powered by [casper-rust-wasm-sdk](https://github.com/casper-ecosystem/casper-rust-wasm-sdk) **2.2.2**.

Live: [https://casper-deployer.interchouette.net/](https://casper-deployer.interchouette.net/)

## What it does

- Connect with [Casper Wallet](https://casperwallet.io)
- Pick a network peer (localhost / testnet / mainnet / custom)
- Query state root hash, global state, dictionary items, balances
- Build, sign, and send **transactions** (Casper 2.x) via the NestJS RPC proxy
- Load a previously signed transaction JSON and send it without re-signing

Browser calls never talk to public nodes directly for RPC — the Nest API (`/api/deployer/*`) runs the Node WASM SDK server-side to avoid CORS.

## Stack

| Layer       | Tech                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| Frontend    | Angular 22, Nx, Tailwind                                                                                          |
| API         | NestJS 11 (JSON-RPC facade + SSE proxy)                                                                           |
| Casper      | `casper-rust-wasm-sdk` 2.2.2 slim packs (browser `transaction,helpers,watcher`; Nest `transaction,deploy,helpers`) |
| Helper WASM | `wasm/` crate (`deployer`) for small encoding helpers                                                             |
| Tests       | Jest, Cypress                                                                                                     |
| Hosting     | Docker / [casper-deployer.interchouette.net](https://casper-deployer.interchouette.net/) (`PORT`, default `4242`) |

## Repository layout

- `casper-rust-wasm-sdk/` — vendored slim browser (`pkg`) and Node (`pkg-nodejs`) SDK builds (see `MANIFEST.md`)
- `docker/` — Dockerfile + compose (build from **repo root**)
- `docs/` — this README + security policy
- `wasm/` — small custom Rust/WASM helpers
- `www/` — Nx monorepo (frontend + api)

## Networks

Configured in [`../www/libs/util/config/src/config.ts`](../www/libs/util/config/src/config.ts):

| Network            | Default RPC                           | Chain name      | SSE                                             |
| ------------------ | ------------------------------------- | --------------- | ----------------------------------------------- |
| Localhost (NCTL 2) | `http://localhost:11101`              | `casper-net-1`  | `http://localhost:18101/events` (1110N → 1810N) |
| Testnet            | `https://node.testnet.casper.network` | `casper-test`   | `…/events`                                      |
| Mainnet            | `https://node.mainnet.casper.network` | `casper`        | `…/events`                                      |
| Custom             | user-supplied URL                     | editable (kept) | same host `/events`                             |

Legacy launcher ports **7777/9999** and integration presets are removed. Local target: [casper-nctl-2-docker](https://github.com/gRoussac/casper-nctl-2-docker).

## Prerequisites

- Node.js ≥ 20 (22 recommended)
- npm ≥ 10
- Optional: Rust + `wasm-pack` to rebuild `wasm/` or refresh SDK packs from [casper-rust-wasm-sdk](https://github.com/casper-ecosystem/casper-rust-wasm-sdk). `make -C wasm pack` / `ensure-binaryen` pins Binaryen **version_130** (not apt / not wasm-pack's 117).

## Local development

From the repository root:

```shell
cd www
npm install
npm start
```

- Frontend (dev): http://localhost:4242 (proxies `/api` to Nest on `:3333`)
- API: Nest listens on port `3333`

```shell
npm run build          # production build → www/dist
npm run serve          # Express static + Nest API (uses PORT, default 4242)
npm test               # Jest
npm run e2e            # Cypress (requires API)
```

### Config knobs

[`../www/libs/util/config/src/config.ts`](../www/libs/util/config/src/config.ts) — gas/TTL defaults, node URLs, path separator for named-key browsing.

## Docker

Build from the **repository root** (context must include `casper-rust-wasm-sdk`, `wasm`, and `www`):

```shell
docker compose -f docker/docker-compose.yml up --build
# or
make docker-build-dev
docker run --rm -p 4242:4242 -e PORT=4242 interchouette/casper-deployer:dev
```

Both Docker stages use `www/package-lock.json` with `npm ci`; the production
stage omits development dependencies without resolving newer package versions.

Published images (Docker Hub):

- [`interchouette/casper-deployer`](https://hub.docker.com/r/interchouette/casper-deployer) (`:dev`, version tags, `:latest`)

```shell
docker pull interchouette/casper-deployer:dev
# or
docker pull interchouette/casper-deployer:latest
```

CI (`.github/workflows/docker-build-push-dev.yml`) on `workflow_dispatch` and on pushes to `dev` that touch image inputs:

1. Builds and pushes Hub `:dev` **and** `:latest` (needs `DOCKER_USERNAME` / `DOCKER_PASSWORD` for `interchouette`)
2. Optionally triggers a Render redeploy via secret `RENDER_DEPLOY_HOOK` (Deploy Hook URL from the Render service → Settings → Deploy Hook). Without that secret, Hub updates but Render keeps the old container until a manual deploy.

Render image deploys: no app env vars required (Render injects `PORT`). Point the service at `interchouette/casper-deployer:latest`.

Open http://localhost:4242/

## SDK upgrade note

The app vendors **slim** SDK packs under `casper-rust-wasm-sdk/` (not the full default build). Feature sets and sizes are recorded in [`../casper-rust-wasm-sdk/MANIFEST.md`](../casper-rust-wasm-sdk/MANIFEST.md).

**Automation (this repo):** Actions → `refresh-slim-sdk-packs` (`workflow_dispatch`). It clones the public SDK, builds the two slim packs, and opens a PR into `dev` (needs `GH_PAT_DEPLOY`). Optional inputs: `sdk_ref` (default `dev`), `sdk_repo` (default `casper-ecosystem/casper-rust-wasm-sdk`).

Manual refresh from a local SDK checkout (Binaryen 130 on `PATH` first — e.g. `make -C /path/to/casper-deployer/wasm ensure-binaryen` then `export PATH="$(cat /path/to/casper-deployer/wasm/.tools/wasm-opt-bin):$PATH"`):

```shell
# browser
cd /path/to/casper-rust-wasm-sdk
wasm-pack build --target web --release --out-dir pkg . \
  --no-default-features --features transaction,helpers,watcher
# Nest API
wasm-pack build --target nodejs --release --out-dir pkg-nodejs . \
  --no-default-features --features transaction,deploy,helpers
jq '.name = "casper-rust-wasm-sdk-nodejs"' pkg-nodejs/package.json > pkg-nodejs/package.json.tmp \
  && mv pkg-nodejs/package.json.tmp pkg-nodejs/package.json

# copy into deployer
rm -rf /path/to/casper-deployer/casper-rust-wasm-sdk/pkg \
       /path/to/casper-deployer/casper-rust-wasm-sdk/pkg-nodejs
cp -a pkg /path/to/casper-deployer/casper-rust-wasm-sdk/pkg
cp -a pkg-nodejs /path/to/casper-deployer/casper-rust-wasm-sdk/pkg-nodejs
```

Helper WASM crate: `make -C wasm pack` (same Binaryen 130 pin).

Then `cd www && npm install`.

## Migration status (1.6 → 2.2.2)

- [x] Vendor `casper-rust-wasm-sdk` **2.2.2**
- [x] Housecleaning (dead escrow stubs, coverage artifacts, Docker context, README)
- [x] Deploy → Transaction make / sign / send / watch (Phase 1)
- [x] Entity / AddressableEntity named-key + dictionary queries (Phase 2)
- [x] Network / peers / SSE hardening (Phase 3 — NCTL `11101`/`18101`, no launcher `7777`)
- [x] Re-enable CI + expand tests (Phase 4)
- [x] Polish (Phase 5): Transaction UI copy, load/send signed JSON, drop speculative exec entirely

Rollback to Casper 1.x: `git checkout v1.6`

## Docs

| Doc | Description |
| --- | --- |
| [`SECURITY.md`](SECURITY.md) | Vulnerability reporting |
| [`../docker/`](../docker/) | Dockerfile / Compose (Hub overview lives in private `.cursor/scripts/DOCKERHUB.md`) |

## License / security

See [`../LICENSE.md`](../LICENSE.md) and [`SECURITY.md`](SECURITY.md).
