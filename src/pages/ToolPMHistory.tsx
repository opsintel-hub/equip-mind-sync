import { ToolPMHistoryList } from "@/components/tools/ToolPMHistoryList";

const ToolPMHistory = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ประวัติ PM เครื่องมือ</h1>
        <p className="text-muted-foreground">
          ดูประวัติการบำรุงรักษาเครื่องมือทั้งหมดพร้อมรายงานสรุป
        </p>
      </div>
      <ToolPMHistoryList />
    </div>
  );
};

export default ToolPMHistory;
