import { Badge } from "@/components/ui/badge";
import { LEAD_TIERS, fmtLead, leadHours, leadTier } from "@/lib/siteAccess";

export default function LeadTimeBadge({ createdAt, plannedStart, showHours = true }: { createdAt?: string | null; plannedStart?: string | null; showHours?: boolean }) {
  const h = leadHours(createdAt, plannedStart);
  const tier = leadTier(h);
  if (!tier) return null;
  return (
    <Badge variant="outline" className={LEAD_TIERS[tier].className}>
      {LEAD_TIERS[tier].label}{showHours ? ` (${fmtLead(h)})` : ""}
    </Badge>
  );
}
