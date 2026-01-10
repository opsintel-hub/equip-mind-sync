import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  code: string;
  name: string;
}

interface Equipment {
  id: string;
  code: string;
  name: string;
  quantity_in_stock: number;
  unit: string;
  category: string;
}

interface Category {
  id: string;
  name: string;
}

interface LoanRequestFormProps {
  onSuccess: () => void;
}

export function LoanRequestForm({ onSuccess }: LoanRequestFormProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [fromCompanyId, setFromCompanyId] = useState("");
  const [toCompanyId, setToCompanyId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [notes, setNotes] = useState("");

  // For equipment search
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [equipmentPopoverOpen, setEquipmentPopoverOpen] = useState(false);
  const [fromCompanyPopoverOpen, setFromCompanyPopoverOpen] = useState(false);
  const [toCompanyPopoverOpen, setToCompanyPopoverOpen] = useState(false);

  useEffect(() => {
    fetchCompanies();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (fromCompanyId) {
      fetchEquipment();
    } else {
      setEquipment([]);
    }
  }, [fromCompanyId]);

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("id, code, name")
      .eq("is_active", true)
      .order("code");
    
    if (error) {
      console.error("Error fetching companies:", error);
    }
    setCompanies(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    setCategories(data || []);
  };

  const fetchEquipment = async () => {
    const { data, error } = await supabase
      .from("equipment")
      .select("id, code, name, quantity_in_stock, unit, category")
      .eq("company_id", fromCompanyId)
      .eq("is_active", true)
      .gt("quantity_in_stock", 0)
      .order("code");
    
    if (error) {
      console.error("Error fetching equipment:", error);
    }
    setEquipment(data || []);
  };

  const selectedEquipment = equipment.find(e => e.id === equipmentId);
  
  // Filter equipment by category and search term
  const filteredEquipment = equipment.filter(eq => {
    const matchesCategory = selectedCategory === "all" || eq.category === selectedCategory;
    const matchesSearch = equipmentSearch === "" || 
      eq.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
      eq.code.toLowerCase().includes(equipmentSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filter companies for dropdown
  const fromCompanies = companies.filter(c => c.id !== toCompanyId);
  const toCompanies = companies.filter(c => c.id !== fromCompanyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fromCompanyId || !toCompanyId || !equipmentId || !quantity || !dueDate || !requesterName) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (fromCompanyId === toCompanyId) {
      toast.error("บริษัทผู้ให้ยืมและผู้ยืมต้องไม่ใช่บริษัทเดียวกัน");
      return;
    }

    const qty = parseInt(quantity);
    if (qty <= 0) {
      toast.error("จำนวนต้องมากกว่า 0");
      return;
    }

    if (selectedEquipment && qty > selectedEquipment.quantity_in_stock) {
      toast.error(`จำนวนที่ขอยืมเกินจำนวนคงเหลือ (มี ${selectedEquipment.quantity_in_stock} ${selectedEquipment.unit})`);
      return;
    }

    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("equipment_loans").insert({
      equipment_id: equipmentId,
      from_company_id: fromCompanyId,
      to_company_id: toCompanyId,
      quantity: qty,
      due_date: dueDate,
      requester_name: requesterName,
      requester_phone: requesterPhone || null,
      notes: notes || null,
      created_by: user?.id
    });

    setIsLoading(false);

    if (error) {
      console.error(error);
      toast.error("ไม่สามารถบันทึกได้");
    } else {
      toast.success("ส่งคำขอยืมสำเร็จ รอการอนุมัติ");
      onSuccess();
    }
  };

  const selectedFromCompany = companies.find(c => c.id === fromCompanyId);
  const selectedToCompany = companies.find(c => c.id === toCompanyId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* From Company - Searchable Combobox */}
        <div className="space-y-2">
          <Label>ยืมจากบริษัท *</Label>
          <Popover open={fromCompanyPopoverOpen} onOpenChange={setFromCompanyPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={fromCompanyPopoverOpen}
                className="w-full justify-between font-normal"
              >
                {selectedFromCompany
                  ? `${selectedFromCompany.code} - ${selectedFromCompany.name}`
                  : "เลือกบริษัทผู้ให้ยืม"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0 z-[100]" align="start">
              <Command>
                <CommandInput placeholder="ค้นหาบริษัท..." />
                <CommandList>
                  <CommandEmpty>ไม่พบบริษัท</CommandEmpty>
                  <CommandGroup>
                    {fromCompanies.map((company) => (
                      <CommandItem
                        key={company.id}
                        value={`${company.code} ${company.name}`}
                        onSelect={() => {
                          setFromCompanyId(company.id);
                          setEquipmentId("");
                          setFromCompanyPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            fromCompanyId === company.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {company.code} - {company.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* To Company - Searchable Combobox */}
        <div className="space-y-2">
          <Label>ยืมไปบริษัท *</Label>
          <Popover open={toCompanyPopoverOpen} onOpenChange={setToCompanyPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={toCompanyPopoverOpen}
                className="w-full justify-between font-normal"
              >
                {selectedToCompany
                  ? `${selectedToCompany.code} - ${selectedToCompany.name}`
                  : "เลือกบริษัทผู้ยืม"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0 z-[100]" align="start">
              <Command>
                <CommandInput placeholder="ค้นหาบริษัท..." />
                <CommandList>
                  <CommandEmpty>ไม่พบบริษัท</CommandEmpty>
                  <CommandGroup>
                    {toCompanies.map((company) => (
                      <CommandItem
                        key={company.id}
                        value={`${company.code} ${company.name}`}
                        onSelect={() => {
                          setToCompanyId(company.id);
                          setToCompanyPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            toCompanyId === company.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {company.code} - {company.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Equipment Selection with Category Filter and Search */}
      <div className="space-y-2">
        <Label>อะไหล่ที่ต้องการยืม *</Label>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={!fromCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="หมวดหมู่" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="ค้นหารหัสหรือชื่ออะไหล่..."
              value={equipmentSearch}
              onChange={(e) => setEquipmentSearch(e.target.value)}
              className="pl-9"
              disabled={!fromCompanyId}
            />
          </div>
        </div>
        
        <Popover open={equipmentPopoverOpen} onOpenChange={setEquipmentPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={equipmentPopoverOpen}
              className="w-full justify-between font-normal"
              disabled={!fromCompanyId}
            >
              {selectedEquipment
                ? `${selectedEquipment.code} - ${selectedEquipment.name} (คงเหลือ: ${selectedEquipment.quantity_in_stock} ${selectedEquipment.unit})`
                : fromCompanyId ? "เลือกอะไหล่" : "เลือกบริษัทผู้ให้ยืมก่อน"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[600px] p-0 z-[100]" align="start">
            <Command>
              <CommandInput 
                placeholder="ค้นหาอะไหล่..." 
                value={equipmentSearch}
                onValueChange={setEquipmentSearch}
              />
              <CommandList className="max-h-[300px]">
                <CommandEmpty>
                  {equipment.length === 0 
                    ? "ไม่พบอะไหล่ในบริษัทที่เลือก" 
                    : "ไม่พบอะไหล่ที่ตรงกับการค้นหา"}
                </CommandEmpty>
                <CommandGroup heading={`พบ ${filteredEquipment.length} รายการ`}>
                  {filteredEquipment.slice(0, 50).map((eq) => (
                    <CommandItem
                      key={eq.id}
                      value={`${eq.code} ${eq.name}`}
                      onSelect={() => {
                        setEquipmentId(eq.id);
                        setEquipmentPopoverOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          equipmentId === eq.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-primary">{eq.code}</span>
                          <span className="truncate">{eq.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          หมวดหมู่: {eq.category || "-"} | คงเหลือ: {eq.quantity_in_stock} {eq.unit}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                  {filteredEquipment.length > 50 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                      แสดง 50 รายการแรก กรุณาค้นหาเพื่อกรองผลลัพธ์
                    </div>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>จำนวนที่ต้องการยืม *</Label>
          <Input
            type="number"
            min="1"
            max={selectedEquipment?.quantity_in_stock}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="ระบุจำนวน"
          />
          {selectedEquipment && (
            <p className="text-sm text-muted-foreground">
              คงเหลือ: {selectedEquipment.quantity_in_stock} {selectedEquipment.unit}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>กำหนดคืน *</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            min={format(new Date(), "yyyy-MM-dd")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ชื่อผู้ขอยืม *</Label>
          <Input
            value={requesterName}
            onChange={(e) => setRequesterName(e.target.value)}
            placeholder="ระบุชื่อผู้ขอยืม"
          />
        </div>

        <div className="space-y-2">
          <Label>เบอร์โทรศัพท์</Label>
          <Input
            value={requesterPhone}
            onChange={(e) => setRequesterPhone(e.target.value)}
            placeholder="ระบุเบอร์โทรศัพท์"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>หมายเหตุ</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "กำลังบันทึก..." : "ส่งคำขอยืม"}
        </Button>
      </div>
    </form>
  );
}
