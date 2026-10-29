# ShipGate

ShipGate checks each PayPal order against PayPal's published Seller Protection requirements
before the seller ships, records an evidence bundle at ship time, and drafts a dispute response
that the seller reviews before it is sent.

Status: scaffold only (Slice 0). No features yet.

## Disclaimer

This tool checks published requirements only. PayPal decides eligibility in its sole discretion.
ShipGate does not predict PayPal decisions. Wording used in the app: "meets published
requirements" or "does not meet".

## Repo layout

- `packages/rules`: pure TypeScript rule engine (no I/O)
- `apps/api`: Fastify API
- `apps/web`: Vite + React front end

## Setup

Requirements: Node 22, pnpm.

```sh
pnpm install
pnpm lint
pnpm test
```

Copy `.env.example` to `.env` and fill in values locally. Never commit `.env`.

## Free-tier notes

- Everything runs on free tiers. No paid services.
- The LLM free tier may let the provider use prompts to improve its products. Only synthetic or
  fixture data is ever sent.
- The deployed demo runs on a free Render web service. It sleeps after about 15 minutes idle and
  takes about a minute to wake. The video is the primary demo.
- Fixtures are labelled "unverified anecdote" or "synthetic". The carrier tracking in the demo is a
  labelled simulator. The PayPal sandbox does not adjudicate Seller Protection.

## License

MIT. See `LICENSE`.
