import { EquipmentPMScheduleList } from "@/components/equipment-pm/EquipmentPMScheduleList";

const EquipmentPMSchedule = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ตาราง PM เครื่องมือ</h1>
        <p className="text-muted-foreground">
          จัดการตารางบำรุงรักษาเครื่องมือเชิงป้องกัน
        </p>
      </div>
      <EquipmentPMScheduleList />
    </div>
  );
};

export default EquipmentPMSchedule;
