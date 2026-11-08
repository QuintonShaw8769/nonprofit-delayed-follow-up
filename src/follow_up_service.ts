import { z } from "zod";
import { InfraiClient } from "./infrai.ts";

export const followUpRequest = z.object({
  donor_id: z.string().min(1),
  receipt_email: z.string().email(),
  campaign: z.string().min(1),
  delay_hours: z.number().int().min(1).max(168),
  task_url: z.string().url()
});

export type FollowUpRequest = z.infer<typeof followUpRequest>;

export function cronFor(request: FollowUpRequest): { cron_expr: string; task: string } {
  const hours = request.delay_hours;
  return {
    cron_expr: `0 */${hours} * * *`,
    task: request.task_url
  };
}

export async function scheduleReceipt(request: unknown, client: InfraiClient) {
  const parsed = followUpRequest.parse(request);
  return client.cron.create(cronFor(parsed));
}

export async function runReceipt(request: unknown, client: InfraiClient) {
  const parsed = followUpRequest.parse(request);
  try {
    return { kind: "receipt", donor_id: parsed.donor_id, campaign: parsed.campaign };
  } catch (error) {
    await client.errors.capture({ exception: error });
    throw error;
  }
}

if (process.argv[1]?.endsWith("follow_up_service.ts")) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const request = JSON.parse(process.env.FOLLOW_UP_REQUEST ?? "{}") as unknown;
  const result = await scheduleReceipt(request, new InfraiClient(key));
  console.log(JSON.stringify({ scheduled_job_id: result.job_id }));
}
