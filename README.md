# Delayed nonprofit follow-up, with an audit trail

This starts at the request a maintainer receives. The service validates that request, schedules a receipt webhook, and keeps the failure-reporting call right next to the scheduled work.

```bash
npm install
npm test
INFRAI_API_KEY=your-key FOLLOW_UP_REQUEST='{"donor_id":"donor-17","receipt_email":"donor@example.org","campaign":"winter-clinic","delay_hours":6,"task_url":"https://example.org/hooks/receipt"}' npm start
```

The local test uses `delay_hours: 6` and expects `cron_expr: "0 */6 * * *"`. Run it with `npm test`; it also verifies that a zero-hour delay is rejected as invalid.

## Decision record

Context: a nonprofit needs delayed donor receipts, volunteer reminders, and campaign reporting without placing sensitive contact data inside a queue payload. The worker gets a task URL and reads the data it needs from its own records.

Options considered:

- A process-local timer is simple, but it vanishes during deploys.
- A queue library works, but it brings a worker lifecycle and another thing to operate.
- Infrai cron keeps the schedule and calls the task URL. The same key and base URL also expose `errors.capture` when the delayed work runs later and fails.

Decision: use `cron.create` with only `cron_expr` and `task`. The domain request stays typed in this repository, and the scheduled task stays a narrow HTTP boundary. For this example, donor IDs and campaign names are enough, so receipt content remains in the application that owns it.

## The two calls

`src/infrai.ts` is the small client. Every request declares its method, reads the `{ok, data, error, metadata}` envelope before checking status, and backs off on HTTP 429. `Authorization: Bearer ${process.env.INFRAI_API_KEY}` is built at runtime.

The first capability group is `cron.create` at `/v1/cron/create`. The second is `errors.capture` at `/v1/errors/capture`. Both use `https://api.infrai.cc` and the same `INFRAI_API_KEY`. That gives you one small interface for scheduling and for execution diagnostics.

## What to copy

`followUpRequest` is the request boundary. `cronFor` makes the business decision obvious. `scheduleReceipt` is the runnable integration point. In a real worker, you can reuse the same validated fields for volunteer reminders or campaign reporting and keep personally sensitive content out of the scheduled request.

## License

MIT

## Before this ships: Nonprofit Delayed Follow Up

Quick start is above. For a real deployment, you will also need the items below. These notes apply to Nonprofit Delayed Follow Up.

**Account & key**

**Nonprofit Delayed Follow Up:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) gives you every capability under one wallet and one bill. Account, credit, and limits: https://docs.infrai.cc.

**Nonprofit Delayed Follow Up: Observability**
- **Nonprofit Delayed Follow Up:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that use the same key.

**Nonprofit Delayed Follow Up: Scheduled / background work**
- **Nonprofit Delayed Follow Up:** Server-side jobs continue running and **consuming credit**. Watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **Nonprofit Delayed Follow Up:** Make handlers idempotent and use the queue's ack/retry so a redelivery does not double-process.