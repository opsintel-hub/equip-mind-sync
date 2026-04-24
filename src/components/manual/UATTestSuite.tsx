import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ClipboardCheck, Download } from "lucide-react";
import { allUATModules } from "./uat";
import { UATCaseCard } from "./uat/UATCaseCard";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { toast } from "sonner";

export function UATTestSuite() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(allUATModules[0].id);

  const filteredModules = useMemo(() => {
    if (!search.trim()) return allUATModules;
    const q = search.toLowerCase();
    return allUATModules.map((m) => ({
      ...m,
      cases: m.cases.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.scenario.toLowerCase().includes(q) ||
          c.menu.toLowerCase().includes(q)
      ),
    })).filter((m) => m.cases.length > 0);
  }, [search]);

  const totalCases = allUATModules.reduce((sum, m) => sum + m.cases.length, 0);
  const criticalCount = allUATModules.reduce(
    (sum, m) => sum + m.cases.filter((c) => c.priority === "Critical").length,
    0
  );

  const handleExportDocx = async () => {
    try {
      toast.info("กำลังสร้างเอกสาร UAT...");
      const children: Paragraph[] = [];

      // Title
      children.push(
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "UAT Test Suite", bold: true, size: 40 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `รวม ${totalCases} Test Cases | Critical: ${criticalCount}`, italics: true, size: 22 })],
        }),
        new Paragraph({ children: [new TextRun("")] })
      );

      allUATModules.forEach((module) => {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: module.title, bold: true, size: 32 })],
          }),
          new Paragraph({ children: [new TextRun({ text: module.description, italics: true })] }),
          new Paragraph({ children: [new TextRun("")] })
        );

        module.cases.forEach((tc) => {
          children.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text: `${tc.id} — ${tc.title}`, bold: true })],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Priority: ", bold: true }),
                new TextRun(tc.priority),
                new TextRun({ text: "  |  Role: ", bold: true }),
                new TextRun(tc.role),
              ],
            }),
            new Paragraph({
              children: [new TextRun({ text: "Scenario: ", bold: true }), new TextRun(tc.scenario)],
            }),
            new Paragraph({
              children: [new TextRun({ text: "เมนู: ", bold: true }), new TextRun(tc.menu)],
            }),
            new Paragraph({
              children: [new TextRun({ text: "Pre-conditions:", bold: true })],
            })
          );
          tc.preconditions.forEach((p) =>
            children.push(new Paragraph({ children: [new TextRun(`  • ${p}`)] }))
          );

          if (tc.testData?.length) {
            children.push(new Paragraph({ children: [new TextRun({ text: "Test Data:", bold: true })] }));
            tc.testData.forEach((d) =>
              children.push(new Paragraph({ children: [new TextRun(`  • ${d}`)] }))
            );
          }

          children.push(new Paragraph({ children: [new TextRun({ text: "Steps:", bold: true })] }));
          tc.steps.forEach((s) => {
            children.push(new Paragraph({ children: [new TextRun(`  ${s.no}. ${s.action}`)] }));
            if (s.expected) {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: `     → คาดหวัง: ${s.expected}`, italics: true })],
                })
              );
            }
          });

          children.push(new Paragraph({ children: [new TextRun({ text: "Acceptance Criteria:", bold: true })] }));
          tc.acceptanceCriteria.forEach((a) =>
            children.push(new Paragraph({ children: [new TextRun(`  ✓ ${a}`)] }))
          );

          if (tc.crossCheck?.length) {
            children.push(new Paragraph({ children: [new TextRun({ text: "Cross-Check:", bold: true })] }));
            tc.crossCheck.forEach((c) =>
              children.push(new Paragraph({ children: [new TextRun(`  ↳ ${c.menu}: ${c.verify}`)] }))
            );
          }

          children.push(
            new Paragraph({ children: [new TextRun({ text: "Result: ☐ PASS    ☐ FAIL    Notes: _______________________", bold: true })] }),
            new Paragraph({ children: [new TextRun("")] })
          );
        });
      });

      const doc = new Document({
        sections: [{ properties: { page: { size: { width: 12240, height: 15840 } } }, children }],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `UAT-Test-Suite-${new Date().toISOString().split("T")[0]}.docx`);
      toast.success("Export สำเร็จ");
    } catch (e) {
      toast.error("Export ล้มเหลว");
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                UAT Test Suite
              </CardTitle>
              <CardDescription className="mt-1">
                Test Cases ครบ Loop ทุกเมนู — พร้อมใช้งานเป็น UAT Sheet จริง
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">รวม {totalCases} Cases</Badge>
              <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200">
                Critical: {criticalCount}
              </Badge>
              <Button size="sm" variant="outline" onClick={handleExportDocx}>
                <Download className="h-4 w-4 mr-1" /> Export DOCX
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหา Test Case (ID, ชื่อ, scenario, เมนู)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs by Module */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-auto flex-wrap justify-start gap-1 p-1">
          {filteredModules.map((m) => (
            <TabsTrigger key={m.id} value={m.id} className="text-xs">
              {m.title.replace(/^Module \d+: /, "")}
              <Badge variant="secondary" className="ml-1.5 text-[9px] px-1">
                {m.cases.length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {filteredModules.map((m) => (
          <TabsContent key={m.id} value={m.id} className="space-y-3 mt-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-foreground">{m.description}</p>
            </div>
            {m.cases.map((tc, i) => (
              <UATCaseCard key={tc.id} testCase={tc} defaultOpen={i === 0} />
            ))}
          </TabsContent>
        ))}
      </Tabs>

      {filteredModules.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">ไม่พบ Test Case ที่ค้นหา</CardContent></Card>
      )}
    </div>
  );
}
