# ChainTrace — Blockchain Investigation Prototype

ChainTrace is a Node/Express prototype for live Ethereum screening, explainable wallet risk and investigator-led transaction tracing.

## Run

```bash
npm install
npm start
```

Open http://localhost:3000

## Live monitoring

Wallets with a complete Ethereum address are scanned every 20 seconds while the dashboard is open. Live monitoring uses Alchemy's free Ethereum API tier and supports up to five wallets per browser.

When a new qualifying transaction is detected:

- ChainTrace shows an immediate on-screen high-risk alert popup.
- The alert is added to the Alerts and Transactions views.
- The popup can open the wallet investigation.
- If SMTP is configured, an email is sent automatically.
- Duplicate transaction alerts are suppressed in the browser using localStorage.

The first scan establishes a baseline, so historical activity does not create popup spam. Later scans alert on new transfers of at least **10 ETH** or **10,000 USDC, USDT, or DAI**.

## Email alerts

Copy `.env.example` to `.env` and configure:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=ChainTrace <your-email@gmail.com>
ALERT_EMAIL_TO=your-email@gmail.com
```

For Gmail, use a Google **App Password**, not your normal account password.

Email is optional. Popup alerts work without SMTP.

## Blockchain data

Add a free Alchemy API key to `.env` for live monitoring. Without it, investigation lookup uses the free Blockscout fallback, but monitoring is disabled.

## Investigation Workspace

The Investigations section accepts either:

- A complete Ethereum wallet address (`0x` plus 40 hexadecimal characters).
- A complete Ethereum transaction hash (`0x` plus 64 hexadecimal characters).

Wallet searches retrieve recent incoming and outgoing transfers, calculate explainable behavioral signals, display key counterparties in a relationship graph, and allow the investigator to add the wallet directly to close monitoring. Graph nodes and transaction hashes can be clicked to continue tracing.

Transaction-hash search retrieves the Ethereum transaction, receipt, supported stablecoin transfer logs, sender/recipient relationship, and contextual sender behavior. Transaction search requires the free Alchemy key; wallet search can fall back to Blockscout.

Current explainable indicators include large-value activity, rapid movement, sustained bursts, fan-in, fan-out, immediate forwarding, counterparty concentration, and compounded flow patterns. Scores are screening priorities—not declarations of criminal activity.

The investigation API is available at:

```text
GET /api/investigate?query=<wallet-address-or-transaction-hash>
```

Responses are cached for 30 seconds to reduce free-tier requests.

## Current prototype highlights

- Fixed navigation/view switching so each sidebar option displays its own section instead of leaving the dashboard visible.
- Added cache-busting to `app.js` so the browser does not keep an older JavaScript build.
- Added **Test Suspicious Alert** on Wallet Monitor for a reliable hackathon demo.
- Test alert opens both the red popup/toast and detailed suspicious-activity modal.
- Added **Send Test Email** in Settings; it uses the same SMTP configuration as real alerts.
- Monitored wallets are saved in browser local storage.
- Monitor Investigate/Remove buttons are now functional.
- Added clearer monitor status and 20-second scan information.
- Added global latest-block screening and an explainable risk queue.
- Added alert cooldown, deduplication and escalation bypass for materially stronger evidence.
- Added universal wallet/transaction investigation with a native relationship graph and evidence panel.
