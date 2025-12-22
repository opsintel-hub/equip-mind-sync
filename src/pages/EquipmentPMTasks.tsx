import { EquipmentPMTaskList } from "@/components/equipment-pm/EquipmentPMTaskList";

const EquipmentPMTasks = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">งาน PM เครื่องมือ</h1>
        <p className="text-muted-foreground">
          จัดการงานตรวจสอบ PM เครื่องมือ พร้อมบันทึกผลการตรวจสอบ
        </p>
      </div>
      <EquipmentPMTaskList />
    </div>
  );
};

export default EquipmentPMTasks;