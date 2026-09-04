import { TICKET_PREFIX } from "@/lib/constants";

/** Show and store HMP-YYYY-NNNNN even if an older row still has HZL-. */
export function canonicalTicketId(raw: string): string {
  return raw.trim().replace(/^HZL-/i, `${TICKET_PREFIX}-`);
}

export function ticketIdLookupKeys(raw: string): string[] {
  const id = raw.trim();
  const canon = canonicalTicketId(id);
  const legacy = canon.replace(new RegExp(`^${TICKET_PREFIX}-`), "HZL-");
  return [...new Set([id, canon, legacy])];
}
