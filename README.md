# ChainTrace — Real-time Wallet Alerts

ChainTrace is a Node/Express prototype for blockchain wallet intelligence.

## Run

```bash
npm install
npm start
```

Open http://localhost:3000

## Live monitoring

Wallets with a complete Ethereum address are scanned every 20 seconds while the dashboard is open. The screening engine flags explainable prototype risk signals such as large-value transfers and selected high-risk service keywords.

When a new suspicious transaction is detected:

- ChainTrace shows an immediate on-screen high-risk alert popup.
- The alert is added to the Alerts and Transactions views.
- The popup can open the wallet investigation.
- If SMTP is configured, an email is sent automatically.
- Duplicate transaction alerts are suppressed in the browser using localStorage.

The first scan establishes a baseline for already-monitored wallets. A wallet newly added through **Add Wallet** is scanned immediately.

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

Add an Alchemy API key to `.env` for richer transfer categories. Without it, ChainTrace uses the free Blockscout Ethereum API fallback.

## v9.1 changes

- Fixed navigation/view switching so each sidebar option displays its own section instead of leaving the dashboard visible.
- Added cache-busting to `app.js` so the browser does not keep an older JavaScript build.
- Added **Test Suspicious Alert** on Wallet Monitor for a reliable hackathon demo.
- Test alert opens both the red popup/toast and detailed suspicious-activity modal.
- Added **Send Test Email** in Settings; it uses the same SMTP configuration as real alerts.
- Monitored wallets are saved in browser local storage.
- Monitor Investigate/Remove buttons are now functional.
- Added clearer monitor status and 20-second scan information.
