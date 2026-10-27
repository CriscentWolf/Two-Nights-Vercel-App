# Two Nights

A Vercel-targeted Next.js application for discovering two-day Retail WoW Mythic raid teams. This is a first working implementation, not a completed or audited top-100 dataset.

## Run locally

Requires Node.js 20.9 or later and npm (normally bundled with Node.js).

```sh
npm install
npm test
npm run dev
```

Open http://localhost:3000. Select a region, fetch raid metadata using an expansion API ID, choose the intended raid, and load candidates. Expansion ID 11 is a starting input, not an automatically verified current-tier selection. The app never silently selects a current tier based on a date.

## Deploy to Vercel

1. Put this directory in a GitHub repository and import that repository into Vercel. If it is inside a larger repository, set the Root Directory to `two-nights`.
2. Vercel should detect Next.js. Use the default install command and `npm run build`.
3. Deploy. Public Raider.IO rankings need no WCL credentials. Upstream availability and policies still apply.
4. To enable optional activity inspection, register a Warcraft Logs API client and set `WCL_CLIENT_ID`, `WCL_CLIENT_SECRET`, and a long random `ACTIVITY_ACCESS_TOKEN` as server environment variables. Redeploy after changing them. Never prefix these variables with `NEXT_PUBLIC_` or commit an env file.

The app never writes to Vercel's ephemeral filesystem at runtime. No database is needed for this version. Schedule imports are held in browser memory and disappear on reload. Download and keep your evidence JSON separately. Shared durable evidence and unattended syncing require a later database-backed implementation.

## Using schedule evidence

Download the schedule template in the app. Replace every placeholder with a real guild and a source for that guild's required schedule. The realm must be its Raider.IO slug; the raid must match the selected raid slug. Import a JSON array of records with these fields:

| Field | Meaning |
| --- | --- |
| `region`, `realm`, `name` | Provider guild identity |
| `raid`, `team` | Specific raid slug and team being evaluated |
| `days` | Unique `Mon`–`Sun` abbreviations for required regular nights |
| `hours` | Total scheduled hours per week |
| `timeZone` | IANA identifier, e.g. `America/New_York` |
| `extraRequiredNights` | Whether extra required progression nights are used |
| `logsConsistent` | Reviewer's attestation after inspecting progression activity |
| `sourceUrl` | HTTPS schedule evidence URL |
| `checkedAt` | Review date in YYYY-MM-DD format |
| `notes` | Exceptions, log links, progression-period coverage, attribution details |

“Verified by reviewer” is a local classification based on imported assertions. The server does not independently attest that the source says what the record claims. Imported links are validated for HTTPS but are never fetched by the app. Records older than 60 days require review. Exactly two unique scheduled nights qualify; extra required nights are excluded by default. Multiple teams for one guild and raid are rejected because provider progression cannot yet be attributed to a specific team.

## Ranking and coverage

The app preserves Raider.IO's returned Mythic ranking order, then filters qualifying guilds and assigns provisional two-day positions. Source ranks are passed through, not recomputed. There is no parse-based scoring and no cross-raid combined score. Load additional pages of 50 guilds; do not mistake the first 50 overall guilds for the top 100 two-day guilds.

All lists remain explicitly provisional. Unknown or outdated schedule evidence above the cutoff is counted. To support a credible top 100, inspect all higher-ranked unresolved candidates and continue scanning until 100 qualifying guilds are found or the provider is exhausted. This app does not prove that every eligible guild in the game has public data.

## Optional Warcraft Logs activity inspection

Open a guild dossier and expand activity inspection. Enter the configured access token, the Warcraft Logs zone ID for the selected raid (not Raider.IO's raid ID), and the team's time zone. The request retrieves the first 100 public guild reports over 56 days and reports pagination truncation explicitly. It merges overlapping or nearby Mythic boss fights, joining gaps up to two hours. This handles duplicate uploads and split reports across midnight, but it is a heuristic and may merge separate teams. Hours shown span first to last pull, including intervening gaps.

It does not count required weekly nights, inspect the entire tier automatically, resolve personal uploads, access private reports, or verify team attribution. No activity check automatically changes imported schedule evidence. Human review is required before setting `logsConsistent` to true. Use this owner tool with Vercel deployment protection or appropriate rate limiting for a public launch; its access token is only held in browser state, not stored.

## Verification in the authoring environment

`node --test tests/*.test.mjs` covers eligibility, evidence validation, top-100 ordering, coverage gaps, session merging, provider normalization and API input/access checks. Server modules can be syntax checked with Node.

Outbound package downloads and provider requests were blocked in the authoring environment. A full Next.js installation/build, browser rendering, and live Raider.IO/WCL requests have **not** been verified. Run `npm install`, `npm test`, and `npm run build` before deployment; validate live response shapes and a sample of manually checked guilds before trusting rankings. There is no dependency lockfile because installation could not complete. CSS uses optional Google Fonts with system fallbacks.

## Next production steps

- Validate live APIs and tier metadata with actual provider responses.
- Store reviewed evidence, report snapshots and reviewer history in Postgres.
- Add reviewer login and protect activity requests with per-user quotas.
- Implement resumable background scanning and full-tier activity review.
- Resolve guild renames, transfers, cross-provider identity and multiple teams.
- Add weekly reset-aware summaries, full-tier extra-night flags, and immutable ranking snapshots.

## Sources

- [Raider.IO developer API](https://raider.io/api)
- [Warcraft Logs API](https://www.warcraftlogs.com/api/docs)
- [Warcraft Logs report schema](https://www.warcraftlogs.com/v2-api-docs/warcraft/report.doc.html)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)

Independent fan project; not affiliated with Blizzard Entertainment, Raider.IO or Warcraft Logs.
