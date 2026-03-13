import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Zap, Navigation, GitBranch, Info } from "lucide-react";

interface MenuRef {
  menu: string;
  path?: string;
}

interface AutomationItem {
  label: string;
  description: string;
  type: "auto-fill" | "auto-create" | "auto-update" | "auto-detect" | "auto-notify";
}

interface DecisionBranch {
  condition: string;
  yesLabel: string;
  yesTarget: string;
  noLabel: string;
  noTarget: string;
}

// ── Menu Reference Tags ──
export function MenuTags({ menus }: { menus: MenuRef[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1">
      <Navigation className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      <span className="text-[10px] text-muted-foreground font-medium">เมนู:</span>
      {menus.map((m, i) => (
        <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
          {m.menu}
        </Badge>
      ))}
    </div>
  );
}

// ── Automation Highlights ──
const autoTypeConfig: Record<AutomationItem["type"], { color: string; label: string }> = {
  "auto-fill": { color: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300", label: "Auto Fill" },
  "auto-create": { color: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300", label: "Auto Create" },
  "auto-update": { color: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300", label: "Auto Update" },
  "auto-detect": { color: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300", label: "Auto Detect" },
  "auto-notify": { color: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300", label: "Auto Notify" },
};

export function AutomationBadges({ items }: { items: AutomationItem[] }) {
  return (
    <div className="space-y-1 mt-2">
      <div className="flex items-center gap-1.5">
        <Zap className="h-3 w-3 text-amber-500 flex-shrink-0" />
        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Automation</span>
      </div>
      <div className="space-y-1 ml-4">
        {items.map((item, i) => {
          const cfg = autoTypeConfig[item.type];
          return (
            <div key={i} className="flex items-start gap-1.5">
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 flex-shrink-0 ${cfg.color}`}>
                ⚡ {cfg.label}
              </Badge>
              <span className="text-[10px] text-muted-foreground leading-tight">{item.description}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Decision Branch ──
export function DecisionBox({ decision }: { decision: DecisionBranch }) {
  return (
    <div className="mt-2 p-2.5 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20">
      <div className="flex items-center gap-1.5 mb-1.5">
        <GitBranch className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
        <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">จุดตัดสินใจ</span>
      </div>
      <div className="text-[11px] font-medium text-foreground mb-1.5">❓ {decision.condition}</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5 p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ {decision.yesLabel}:</span>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-300">{decision.yesTarget}</span>
        </div>
        <div className="flex items-center gap-1.5 p-1.5 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <span className="text-[10px] font-bold text-red-600 dark:text-red-400">✗ {decision.noLabel}:</span>
          <span className="text-[10px] text-red-700 dark:text-red-300">{decision.noTarget}</span>
        </div>
      </div>
    </div>
  );
}

// ── Combined Flow Step Detail ──
interface FlowStepDetailProps {
  title: string;
  menus?: MenuRef[];
  automations?: AutomationItem[];
  decision?: DecisionBranch;
  notes?: string[];
}

export function FlowStepDetail({ title, menus, automations, decision, notes }: FlowStepDetailProps) {
  return (
    <div className="p-3 border rounded-lg space-y-1.5">
      <h5 className="font-medium text-sm">{title}</h5>
      {menus && menus.length > 0 && <MenuTags menus={menus} />}
      {notes && notes.length > 0 && (
        <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside ml-1">
          {notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
      {automations && automations.length > 0 && <AutomationBadges items={automations} />}
      {decision && <DecisionBox decision={decision} />}
    </div>
  );
}
