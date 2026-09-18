# Public boundary

Every file here is publicly readable. Never add automation config, raw histories, captions, source
URLs, Slack/LinkedIn identifiers, tokens, API keys, logs, or queue records. The private exporter
permits only `index.html`, `state.json`, `static/operations.css`, and `static/operations.js` during
refresh. The Pages workflow uses only GitHub's built-in token and needs no VOXYN runtime secret.

The private sync credential should be a short-lived fine-grained PAT restricted to this repository
with **Contents: Read and write** only. Rotate it in the private repository and revoke the old token.
