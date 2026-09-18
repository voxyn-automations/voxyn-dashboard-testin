# VOXYN public operations dashboard

RC10 uses public snapshot schema v2. It adds only the buyer-local generic schedule,
sanitized queue status, configured Publisher grace minutes, and daily aggregate history.
The browser performs historical filtering, persistent light/dark preference, and schedule
progression locally; it calls no private API and stores no operational data.

This repository is intentionally public and contains presentation files plus a strict public-safe
`state.json`. It contains no automation engine, private configuration, captions, queue JSON,
credentials, private histories, or service clients. GitHub Pages deploys the static root.

Enable Pages at **Settings → Pages → Source: GitHub Actions**. The expected project URL is
`https://OWNER.github.io/REPOSITORY/`; the Pages deployment output is authoritative.

The first package upload intentionally waits for synchronized operational data.
After configuring the GitHub Actions Pages source, run the one-time private
dashboard sync. Its state update triggers the first real Pages deployment.
A missing/branch Pages source produces a clear action-required message and no
deployment attempt. Once configured, normal public state pushes deploy automatically.

Updates arrive from the separate private automation repository. This public repository requires no
VOXYN runtime Secrets or Variables. To disable it, set `DASHBOARD_ENABLED=false` in the private
repository; to remove it, disable Pages and delete/archive this public repository.
# Automatic refresh

The private automation exports safe status after durable generation/publication
changes and successful source health checks. Public main pushes redeploy Pages
automatically. No daily dashboard action is required. Complete the one-time initial
sync in the private installer guidance; later manual refresh is troubleshooting only.
The deployable HTML and content-addressed assets are generated exclusively from
the authoritative `dashboard/` frontend during packaging. Files in this source
support folder are never used as an independent packaged frontend.
