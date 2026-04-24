import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ClipboardCheck, ListChecks, PlusCircle, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SymptomSelect } from "@/components/media-player/SymptomSelect";
import { AssessmentResultSelect } from "@/components/media-player/AssessmentResultSelect";

interface AssessmentLog {
  id: string;
  document_no: string;
  media_player_id: string | null;
  equipment_id: string | null;
  serial_number: string | null;
  source_type: string;
  symptom_id: string | null;
  symptom_description: string | null;
  assessment_result_id: string | null;
  diagnosis_notes: string | null;
  recommended_action: string | null;
  assessor_name: string | null;
  assessed_at: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface SubjectOption {
  id: string;
  type: "media_player" | "equipment";
  code: string;
  name: string;
  serial: string | null;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "รอประเมิน", variant: "secondary" },
  completed: { label: "ประเมินแล้ว", variant: "default" },
  cancelled: { label: "ยกเลิก", variant: "outline" },
};

export default function AssessmentLog() {
  const { user } = useAuth();
  const location = useLocation();
  const [logs, setLogs] = useState<AssessmentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");

  // Subject options (combined media_players + equipment serials)
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  // Form state
  const [subjectKey, setSubjectKey] = useState(""); // "mp:<id>" or "eq:<id>"
  const [symptomId, setSymptomId] = useState("");
  const [symptomDescription, setSymptomDescription] = useState("");
  const [assessmentResultId, setAssessmentResultId] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [assessorName, setAssessorName] = useState("");
  const [notes, setNotes] = useState("");
  const [statusForm, setStatusForm] = useState<"pending" | "completed">("completed");
  const [submitting, setSubmitting] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("assessment_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } else {
      setLogs((data as AssessmentLog[]) || []);
    }
    setLoading(false);
  };

  const fetchSubjects = async () => {
    setSubjectsLoading(true);
    const [mpRes, eqRes] = await Promise.all([
      supabase
        .from("media_players")
        .select("id, code, name, serial_number")
        .order("code")
        .limit(500),
      supabase
        .from("equipment_serial_numbers")
        .select("id, serial_number, equipment:equipment_id(code, name)")
        .order("serial_number")
        .limit(500),
    ]);

    const items: SubjectOption[] = [];
    (mpRes.data || []).forEach((mp: any) => {
      items.push({
        id: mp.id,
        type: "media_player",
        code: mp.code,
        name: mp.name || "Media Player",
        serial: mp.serial_number,
      });
    });
    (eqRes.data || []).forEach((sn: any) => {
      items.push({
        id: sn.id,
        type: "equipment",
        code: sn.equipment?.code || "—",
        name: sn.equipment?.name || "Equipment",
        serial: sn.serial_number,
      });
    });
    setSubjects(items);
    setSubjectsLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    fetchSubjects();
  }, []);

  const subjectOptions = useMemo(
    () =>
      subjects.map((s) => ({
        value: `${s.type === "media_player" ? "mp" : "eq"}:${s.id}${s.type === "equipment" && s.serial ? `:${s.serial}` : ""}`,
        label: `${s.code} — ${s.name}${s.serial ? ` (S/N: ${s.serial})` : ""}`,
        description: s.type === "media_player" ? "Media Player" : "Equipment",
        searchableText: `${s.code} ${s.name} ${s.serial || ""}`,
      })),
    [subjects]
  );

  const stats = useMemo(() => {
    const total = logs.length;
    const pending = logs.filter((l) => l.status === "pending").length;
    const completed = logs.filter((l) => l.status === "completed").length;
    return { total, pending, completed };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const q = searchTerm.toLowerCase();
    return logs.filter(
      (l) =>
        l.document_no.toLowerCase().includes(q) ||
        (l.serial_number || "").toLowerCase().includes(q) ||
        (l.assessor_name || "").toLowerCase().includes(q) ||
        (l.diagnosis_notes || "").toLowerCase().includes(q)
    );
  }, [logs, searchTerm]);

  const resetForm = () => {
    setSubjectKey("");
    setSymptomId("");
    setSymptomDescription("");
    setAssessmentResultId("");
    setDiagnosisNotes("");
    setRecommendedAction("");
    setAssessorName("");
    setNotes("");
    setStatusForm("completed");
  };

  const handleSubmit = async () => {
    if (!subjectKey) {
      toast.error("กรุณาเลือกอุปกรณ์/Media Player ที่ประเมิน");
      return;
    }
    if (!symptomId && !symptomDescription.trim()) {
      toast.error("กรุณาระบุอาการเสีย");
      return;
    }
    if (statusForm === "completed" && !assessmentResultId) {
      toast.error("กรุณาเลือกผลการประเมินก่อนบันทึกแบบ 'ประเมินแล้ว'");
      return;
    }

    const [prefix, id, serial] = subjectKey.split(":");
    const isMP = prefix === "mp";
    const subject = subjects.find((s) => s.id === id);

    setSubmitting(true);
    const { error } = await supabase.from("assessment_logs").insert({
      document_no: "",
      media_player_id: isMP ? id : null,
      equipment_id: !isMP ? subject?.id || null : null, // serial id maps via equipment_serial_numbers later if needed
      serial_number: serial || subject?.serial || null,
      source_type: "manual",
      symptom_id: symptomId || null,
      symptom_description: symptomDescription.trim() || null,
      assessment_result_id: assessmentResultId || null,
      diagnosis_notes: diagnosisNotes.trim() || null,
      recommended_action: recommendedAction.trim() || null,
      assessor_name: assessorName.trim() || null,
      assessed_by: user?.id ?? null,
      status: statusForm,
      completed_at: statusForm === "completed" ? new Date().toISOString() : null,
      notes: notes.trim() || null,
      created_by: user?.id ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success("บันทึกการประเมินแล้ว");
    resetForm();
    setActiveTab("list");
    fetchLogs();
  };

  const markCompleted = async (log: AssessmentLog) => {
    if (!log.assessment_result_id) {
      toast.error("กรุณาแก้ไขรายการก่อนเพื่อระบุผลการประเมิน");
      return;
    }
    const { error } = await supabase
      .from("assessment_logs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", log.id);
    if (error) {
      toast.error("อัปเดตไม่สำเร็จ");
      return;
    }
    toast.success("ปิดรายการประเมินแล้ว");
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            บันทึกการประเมินทรัพย์สิน
          </h1>
          <p className="text-muted-foreground mt-1">
            บันทึกผลการประเมินอุปกรณ์/Media Player/ทรัพย์สินที่ถูกถอนกลับมา (ซ่อมเอง / ส่งเคลม / Write-off ฯลฯ)
          </p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          โหลดใหม่
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>รายการทั้งหมด</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>รอประเมิน</CardDescription>
            <CardTitle className="text-3xl text-warning">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ประเมินแล้ว</CardDescription>
            <CardTitle className="text-3xl text-success">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">
            <ListChecks className="h-4 w-4 mr-2" /> รายการประเมิน
          </TabsTrigger>
          <TabsTrigger value="new">
            <PlusCircle className="h-4 w-4 mr-2" /> บันทึกการประเมินใหม่
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>รายการประเมินล่าสุด</CardTitle>
                  <CardDescription>คลิก "ปิดรายการ" เพื่อยืนยันการประเมินที่ค้างอยู่</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาเลขที่ / S/N / ผู้ประเมิน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-[280px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  ยังไม่มีรายการประเมิน — กดแท็บ "บันทึกการประเมินใหม่" เพื่อเริ่ม
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log) => {
                    const status = STATUS_LABELS[log.status] || { label: log.status, variant: "outline" as const };
                    return (
                      <div
                        key={log.id}
                        className="flex items-center justify-between gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors flex-wrap"
                      >
                        <div className="flex-1 min-w-[200px] space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold">{log.document_no}</span>
                            <Badge variant={status.variant}>{status.label}</Badge>
                            {log.serial_number && (
                              <Badge variant="outline">S/N: {log.serial_number}</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.diagnosis_notes || log.symptom_description || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ผู้ประเมิน: {log.assessor_name || "—"} •{" "}
                            {format(new Date(log.assessed_at), "dd MMM yyyy HH:mm", { locale: th })}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {log.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => markCompleted(log)}>
                              ปิดรายการ
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>บันทึกการประเมินใหม่</CardTitle>
              <CardDescription>
                ระบุอุปกรณ์ + อาการ + ผลการประเมิน (ค่า dropdown มาจาก Master Data หมวด Media Player)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>อุปกรณ์/Media Player ที่ประเมิน *</Label>
                <SearchableSelect
                  options={subjectOptions}
                  value={subjectKey}
                  onValueChange={setSubjectKey}
                  placeholder="ค้นหาด้วยรหัส, ชื่อ หรือ S/N"
                  searchPlaceholder="ค้นหา..."
                  isLoading={subjectsLoading}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>อาการเสีย *</Label>
                  <SymptomSelect value={symptomId} onChange={setSymptomId} />
                </div>
                <div className="space-y-2">
                  <Label>ผลการประเมิน {statusForm === "completed" ? "*" : ""}</Label>
                  <AssessmentResultSelect value={assessmentResultId} onChange={setAssessmentResultId} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>คำอธิบายอาการเพิ่มเติม</Label>
                <Input
                  value={symptomDescription}
                  onChange={(e) => setSymptomDescription(e.target.value)}
                  placeholder="ระบุอาการที่ไม่มีในรายการ"
                />
              </div>

              <div className="space-y-2">
                <Label>หมายเหตุการวินิจฉัย</Label>
                <Textarea
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  placeholder="สิ่งที่ตรวจพบ, สาเหตุ, ฯลฯ"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>การดำเนินการที่แนะนำ</Label>
                <Textarea
                  value={recommendedAction}
                  onChange={(e) => setRecommendedAction(e.target.value)}
                  placeholder="เช่น ส่งซ่อม, สั่งอะไหล่, Write-off, ส่งเคลม"
                  rows={2}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>ชื่อผู้ประเมิน</Label>
                  <Input value={assessorName} onChange={(e) => setAssessorName(e.target.value)} placeholder="ชื่อ-สกุล" />
                </div>
                <div className="space-y-2">
                  <Label>สถานะ</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={statusForm}
                    onChange={(e) => setStatusForm(e.target.value as "pending" | "completed")}
                  >
                    <option value="completed">ประเมินแล้ว</option>
                    <option value="pending">รอประเมิน (บันทึกร่าง)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>หมายเหตุอื่น ๆ</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="—" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetForm}>ล้างฟอร์ม</Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "กำลังบันทึก..." : "บันทึกการประเมิน"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
