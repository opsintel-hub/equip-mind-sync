import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Circle } from "lucide-react";
import type { UATCase } from "./types";

interface UATCaseCardProps {
  testCase: UATCase;
  defaultOpen?: boolean;
}

const priorityColors: Record<UATCase["priority"], string> = {
  Critical: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  High: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
  Medium: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  Low: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-800",
};

export function UATCaseCard({ testCase, defaultOpen = false }: UATCaseCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<"pass" | "fail" | null>(null);

  const toggleStep = (n: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const progress = testCase.steps.length > 0
    ? Math.round((checkedSteps.size / testCase.steps.length) * 100)
    : 0;

  return (
    <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: result === "pass" ? "hsl(142 71% 45%)" : result === "fail" ? "hsl(0 84% 60%)" : "hsl(var(--primary))" }}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full p-4 hover:bg-muted/40 transition-colors text-left">
          <div className="flex items-start gap-3">
            {open ? <ChevronDown className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-[10px]">{testCase.id}</Badge>
                <Badge variant="outline" className={`text-[10px] ${priorityColors[testCase.priority]}`}>{testCase.priority}</Badge>
                <Badge variant="outline" className="text-[10px] bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                  👤 {testCase.role}
                </Badge>
                {checkedSteps.size > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {checkedSteps.size}/{testCase.steps.length} ({progress}%)
                  </Badge>
                )}
                {result === "pass" && <Badge className="text-[10px] bg-emerald-600 text-white">✓ PASS</Badge>}
                {result === "fail" && <Badge className="text-[10px] bg-red-600 text-white">✗ FAIL</Badge>}
              </div>
              <h4 className="font-semibold text-sm">{testCase.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{testCase.scenario}</p>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <Separator />

            {/* Menu & Preconditions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">📍 เมนู</div>
                <div className="text-foreground">{testCase.menu}</div>
              </div>
              <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="font-semibold text-amber-700 dark:text-amber-300 mb-1">⚙️ Pre-conditions</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {testCase.preconditions.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            </div>

            {/* Test Data */}
            {testCase.testData && testCase.testData.length > 0 && (
              <div className="p-2.5 rounded bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs">
                <div className="font-semibold text-purple-700 dark:text-purple-300 mb-1">📝 Test Data ที่แนะนำ</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {testCase.testData.map((d, i) => <li key={i} className="font-mono">{d}</li>)}
                </ul>
              </div>
            )}

            {/* Steps */}
            <div>
              <div className="font-semibold text-xs mb-2 flex items-center gap-1.5">
                🧪 ขั้นตอนการทดสอบ
                <span className="text-muted-foreground font-normal">(คลิกช่องเพื่อ Mark ผ่าน)</span>
              </div>
              <div className="space-y-1.5">
                {testCase.steps.map((step) => (
                  <div key={step.no} className="flex items-start gap-2 p-2 rounded border bg-card hover:bg-muted/30 transition-colors">
                    <Checkbox
                      checked={checkedSteps.has(step.no)}
                      onCheckedChange={() => toggleStep(step.no)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-primary">{step.no}.</span>
                        <span className={checkedSteps.has(step.no) ? "line-through text-muted-foreground" : ""}>{step.action}</span>
                      </div>
                      {step.expected && (
                        <div className="ml-4 mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 italic">
                          → คาดหวัง: {step.expected}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div className="p-3 rounded-lg border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="font-semibold text-xs text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                ✅ Acceptance Criteria (เกณฑ์ผ่าน)
              </div>
              <ul className="space-y-1 text-xs">
                {testCase.acceptanceCriteria.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cross Check */}
            {testCase.crossCheck && testCase.crossCheck.length > 0 && (
              <div className="p-3 rounded-lg border-2 border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/20">
                <div className="font-semibold text-xs text-cyan-700 dark:text-cyan-300 mb-2">
                  🔗 Cross-Check (ตรวจเชื่อมโยงเมนูอื่น)
                </div>
                <ul className="space-y-1 text-xs">
                  {testCase.crossCheck.map((c, i) => (
                    <li key={i}>
                      <span className="font-semibold">{c.menu}:</span> {c.verify}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pass/Fail Buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant={result === "pass" ? "default" : "outline"}
                className={result === "pass" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                onClick={() => setResult(result === "pass" ? null : "pass")}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> ผ่าน (PASS)
              </Button>
              <Button
                size="sm"
                variant={result === "fail" ? "default" : "outline"}
                className={result === "fail" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                onClick={() => setResult(result === "fail" ? null : "fail")}
              >
                <XCircle className="h-4 w-4 mr-1" /> ไม่ผ่าน (FAIL)
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setCheckedSteps(new Set()); setResult(null); }}
              >
                <Circle className="h-4 w-4 mr-1" /> Reset
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
