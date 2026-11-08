import assert from "node:assert/strict";
import { cronFor, followUpRequest } from "./follow_up_service.ts";

const input = {
  donor_id: "donor-17",
  receipt_email: "donor@example.org",
  campaign: "winter-clinic",
  delay_hours: 6,
  task_url: "https://example.org/hooks/receipt"
};

assert.deepEqual(cronFor(followUpRequest.parse(input)), {
  cron_expr: "0 */6 * * *",
  task: "https://example.org/hooks/receipt"
});
assert.throws(() => followUpRequest.parse({ ...input, delay_hours: 0 }));
console.log("follow-up decision test passed");
