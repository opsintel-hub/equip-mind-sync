import { PMScheduleList } from "@/components/pm/PMScheduleList";

const PMSchedule = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ตารางบำรุงรักษา (PM)</h1>
        <p className="text-muted-foreground">จัดการตารางบำรุงรักษาป้ายโฆษณาเชิงป้องกัน</p>
      </div>
      <PMScheduleList />
    </div>
  );
};

export default PMSchedule;
