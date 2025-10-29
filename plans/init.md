nice—here’s the same spec, upgraded for **Next.js + shadcn/ui** with a clean, modern wallboard. still **no code**, just build-ready detail.

# product shape

* single page. full screen.
* grouped by project.
* one card = one device.
* poll every 15s.
* states: **OK / WARN / ERROR** only.
* legible from 3–4 m on a 50" TV.

---

# tech + app shape (implementation plan, no code)

**Framework**

* Next.js (App Router) + TypeScript.
* shadcn/ui (Radix under the hood) + Tailwind CSS.
* Timezone display: `Asia/Jakarta`.

**State + data**

* React Query for polling, caching, retries, parallel fetch.
* Small UI store (Zustand) for mute state, acks, settings drawer.
* Optional Web Worker later; not needed for this simple pass.

**Audio**

* Short “error” beep asset. Play on transition → `ERROR`, throttle 30s.
* Global mute toggle (persist in localStorage).

**Config**

* The YAML you gave stays as the **single source of truth** (placed in `public/config/monitor.yaml`).
* App reads it at load and builds the project/device list.

---

# pages, routes, components (file map)

**Routes**

* `/` → Dashboard (client component).
* `/health` (route handler, optional): lightweight proxy if you need CORS isolation. Returns `{ ip, status, total_online, ts, error? }`.

**Top-level layout**

* `RootLayout` sets dark theme, full-bleed container, shadcn theme tokens.

**Dashboard (client)**

* Header bar (sticky).
* For each project → Section header + Cards grid.
* Toast region (shadcn `<Toaster>`) for non-blocking notices (e.g., “offline”).
* Dialog for simple device detail (optional).

**Key components (shadcn primitives referenced)**

* `HeaderBar`
  uses `Separator`, `Badge`, `Tooltip`, `Button`, `Switch`.
* `ProjectSection`
  title row with accent stripe, small status counters.
* `DeviceCard`
  based on `Card` + `Badge`. large state text; small meta row.
* `MuteToggle`
  `Switch` with label.
* `Legend`
  three compact badges with colors.
* `DeviceDetailDialog` (optional)
  `Dialog` + `Table` for last samples and error text.

---

# styling and theme (shadcn + Tailwind)

**Global**

* Dark, high-contrast.
* Background `#0b0f14`; panel `#121821`; text `#e6edf3`; muted `#9aa7b2`.
* Status: OK `#22c55e`, WARN `#f59e0b`, ERROR `#ef4444`.

**Project accent (header stripe only)**

* Cyclops `#22d3ee`
* Defiant/volvo `#a78bfa`
* Sky Army V1 `#60a5fa`
* Enigma `#10b981`
* Sky Army V2 `#fbbf24`
* Deimos `#f472b6`

**Type scale (1080p baseline)**

* Title 28–32px, section 22–24px, card label 16px, meta 14–16px.
* State text in card: large (readable at 3–4 m), tabular numerals for stability.

**Density**

* Card min 180×120 px; gap 8–12 px; responsive auto-fit grid.

**Motion**

* 150 ms ease-out on state changes.
* Error pulse: 2 × 300 ms border flash, then steady.

---

# data + polling rules

**Endpoint per device**

* GET `http://{ip}:8084/api/v1/adb-controller/status-all-devices`
* Read `json()['data'][-1]['total_online']`
* Timeout **15s**.

**Status mapping**

* **OK**: 200 + `total_online > 0`
* **WARN**: 200 + `total_online == 0`
* **ERROR**: non-200 | timeout | bad JSON | exception

**Cadence**

* Every **15s** (aligned). Parallel per project. Concurrency cap 8 per project.

**Staleness**

* If no fresh data > **45s**: keep last state but **dim card** and add **“stale”** badge.

**Audio**

* Play on transition into **ERROR** only. Throttle ≥30s. Respect mute + acks.

**Ack**

* Acknowledge device or project for **5 min** (silences sounds for that scope). Persist locally.

---

# UI behavior details

**Header**

* Left: title.
* Center-right: Legend (OK/WARN/ERROR), WIB clock, last refresh, next refresh ETA.
* Right: Mute toggle; Settings (panel with poll/timeout/staleness values).

**Project section**

* Accent stripe and name.
* Counters: `OK n`, `WARN n`, `ERROR n`, and total devices.
* Grid below. Auto-fit columns. Virtualize only if a section > 500 devices.

**Device card**

* Top: IP label (one line, ellipsis).
* Middle: big state text

  * OK → “OK” (green)
  * WARN → “WARN” (amber)
  * ERROR → “ERROR” (red)
* Bottom meta row:

  * “checked Xs ago” (WIB absolute on focus/tooltip).
  * Show `total_online` if 0 (e.g., “online: 0” for WARN).
  * If staled: small “stale” badge.
* Optional click: open detail with last error text and last 20 samples.

**Tooltips**

* shadcn Tooltip on hover/focus: full IP, last check ISO, error message if exists.

**Keyboard**

* `m` mute, `f` fullscreen, `r` force refresh now.

**Offline**

* When navigator offline: red ribbon “offline; retrying…”. Suppress new sounds until online.

---

# accessibility

* Contrast ≥ 7:1 for text on panels.
* Color + label (not color-only).
* Focus rings visible (Radix defaults).
* Reduced motion option disables pulses; use soft color fade instead.
* Audio mirrored by visual change (no audio-only signals).

---

# performance + reliability

* Keep first paint fast (no heavy libs beyond shadcn).
* Avoid expensive shadows; stick to flat panels.
* Batch network requests per project; abort on timeout.
* Avoid re-render storms: only update cards whose state changed.
* LocalStorage for `muted`, acks with expiry, last settings.

---

# configuration (stays the same)

* Use your YAML (already defined).
* Put it in `public/config/monitor.yaml`.
* On load, parse and build: projects → devices list.

---

# environment + ops

* Works in Chrome in kiosk mode.
* Ensure autoplay for short sounds is allowed.
* TV: fixed brightness, disable motion smoothing.
* Deployment: static assets + Next.js server for optional proxy route only.

---

# acceptance checklist

* one page, stacked by project with the accent color stripe.
* each device renders a card: **OK**, **WARN** (when `total_online==0`), or **ERROR**.
* polls every 15s; per-request timeout 15s.
* staleness >45s dims the card + “stale” badge.
* sound only on transition to **ERROR**, throttled; mute + ack work.
* readable at 3–4 m on a 50" TV; high contrast; keyboard shortcuts work.
* no spinners everywhere; cards update quietly and only when needed.

---

# build notes for the AI agent (what to generate, not code)

* create a Next.js App Router project with shadcn preconfigured and a dark theme token set.
* scaffold the components named above with clear props:

  * `DeviceCard({ ip, status, totalOnline, lastChecked, stale, error? })`
  * `ProjectSection({ project: { id, name, accent, hosts[] }, records })`
  * `HeaderBar({ muted, onToggleMute, lastRefresh, nextRefresh })`
* wire React Query to poll each device host concurrently every 15s; set `staleTime` under the poll interval; set retry `0` for WARN/ERROR semantics (explicitly handled by status logic).
* add an optional route handler `/health?ip=` if CORS blocks direct calls; it proxies and normalizes the response.
* respect YAML config path and parse at startup.


