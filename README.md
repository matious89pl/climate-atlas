# Climate Atlas

A visual, day-by-day and month-by-month climate comparison between two cities.
Defaults to **Sydney vs London**, with eight more cities to swap in. Compares
temperature, feels-like, sunshine, rain & snow, wind and UV index — all from ~12
years of real reanalysis data, baked into the app so it runs offline.

**▶ Live: [atlas.strq.dev](https://atlas.strq.dev)**

## What it does

- **Two time resolutions** — toggle *Day by day* (a smoothed 366-point curve for a
  typical year) or *Month by month* (12 points, totals where that's the natural unit).
- **Six measures** — average temperature with its daily high–low band, apparent
  ("feels-like") temperature, bright-sunshine hours, rainfall + snowfall,
  wind speed (with gusts), and UV index shown against the WHO risk bands.
- **A synchronized scrubber** — hover any chart and a guideline tracks the same
  calendar day across every chart while a readout shows all six metrics for both
  cities at once. Defaults to today's date.
- **Any pairing** — 10 cities across both hemispheres, the tropics, a desert and the
  Arctic. Swap either side or flip them.
- **°C / °F** throughout.

Each city is encoded by one accent colour everywhere — the first city warm, the
second cool — so the eye can follow it across every figure.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
```

The committed `src/data/climate.json` already contains every city's normals, so the
app works with no network access and no API key.

## The data

Source: [Open-Meteo](https://open-meteo.com) — ERA5 reanalysis for the daily
record and CAMS for UV. Free, no key required, CC-BY-4.0.

`npm run fetch-data` runs [`scripts/fetch-climate.mjs`](scripts/fetch-climate.mjs),
which:

1. Pulls daily weather for **2013–2024** for each city (UV from 2022, the limit of
   the CAMS archive).
2. Reduces it to **climate normals** two ways: a value per calendar day (averaged
   across years, then smoothed with a 9-day window) and a value per month (averages,
   or per-year totals averaged for rain / snow / sunshine).
3. Computes per-city annual summaries (warmest month, wet days, peak UV, …).
4. Writes the lot to `src/data/climate.json` — saving after every city so a
   re-run resumes past Open-Meteo's rate limit.

These are **climatological averages, not a forecast** — what a typical year looks
like, not what any given day will bring.

### Adding a city

Append it to [`scripts/cities.mjs`](scripts/cities.mjs) (id, name, country,
lat/lon, IANA timezone) and re-run `npm run fetch-data`. Already-fetched cities are
cached, so only the new one is downloaded. It then shows up in the pickers.

## Stack

Vite + React + TypeScript. Charts are hand-built SVG (no charting library) for full
control over the look and the cross-chart crosshair. Type: Fraunces + Archivo.
