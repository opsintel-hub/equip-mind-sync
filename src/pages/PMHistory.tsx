import { PMHistoryList } from "@/components/pm/PMHistoryList";

const PMHistory = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ประวัติการทำ PM</h1>
        <p className="text-muted-foreground">ดูประวัติการบำรุงรักษาเชิงป้องกันทั้งหมดพร้อมรายงานสรุป</p>
      </div>
      <PMHistoryList />
    </div>
  );
};

export default PMHistory;
