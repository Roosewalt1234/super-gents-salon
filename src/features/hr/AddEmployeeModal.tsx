import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { X, Cloud, Check, ChevronsUpDown, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { createEmployee } from "./api";
import { toast } from "sonner";

/* ── Constants ────────────────────────────────────────────────────────────── */

const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Intern",
  "Commission Basis",
  "Others",
];

const VISA_STATUSES = [
  "Visit Visa",
  "Company Visa",
  "NOC from other Company",
];

const NATIONALITIES = [
  "Africa",
  "Australia",
  "Bangladesh",
  "Canada",
  "Egypt",
  "France",
  "Germany",
  "India",
  "Indonesia",
  "Iran",
  "Jordan",
  "Lebanon",
  "Malaysia",
  "Nepal",
  "Netherlands",
  "Pakistan",
  "Philippines",
  "Russia",
  "Sri Lanka",
  "Syria",
  "Thailand",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
];

/* ── Types ────────────────────────────────────────────────────────────────── */

interface AddEmployeeModalProps {
  open: boolean;
  tenantId: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Branch {
  branch_id: string;
  branch_name: string;
  shop_number: string | null;
}

interface FormValues {
  // Tab 1 – Employee Details
  employee_name: string;
  employee_number: string;
  profile_photo_url: string;
  email: string;
  phone: string;
  nationality: string;
  date_of_birth: string;
  gender: string;
  current_visa_status: string;
  current_visa_expiry_date: string;
  notes: string;
  // Tab 2 – Employment Details
  referred_by: string;
  employment_type: string;
  hire_date: string;
  basic_salary: string;
  food_allowance: string;
  ot_amount: string;
  accommodation_amount: string;
  transport_amount: string;
  commission_rate: string;
  position: string;
  assigned_branch_id: string;
  status: string;
  // Tab 3 – Document Details
  visa_branch_id: string;
  visa_expiry_date: string;
  passport_number: string;
  passport_expiry_date: string;
  emirates_id_number: string;
  emirates_id_expiry_date: string;
  ohc_number: string;
  ohc_expiry_date: string;
  iloe_insurance_number: string;
  iloe_insurance_expiry_date: string;
  labor_card_number: string;
  labor_card_expiry_date: string;
  medical_insurance_number: string;
  medical_insurance_expiry_date: string;
  part_time_card_number: string;
  part_time_card_expiry_date: string;
}

const DEFAULT_VALUES: FormValues = {
  employee_name: "",
  employee_number: "",
  profile_photo_url: "",
  email: "",
  phone: "",
  nationality: "",
  date_of_birth: "",
  gender: "",
  current_visa_status: "",
  current_visa_expiry_date: "",
  notes: "",
  referred_by: "",
  employment_type: "",
  hire_date: "",
  basic_salary: "",
  food_allowance: "",
  ot_amount: "",
  accommodation_amount: "",
  transport_amount: "",
  commission_rate: "",
  position: "",
  assigned_branch_id: "",
  status: "active",
  visa_branch_id: "",
  visa_expiry_date: "",
  passport_number: "",
  passport_expiry_date: "",
  emirates_id_number: "",
  emirates_id_expiry_date: "",
  ohc_number: "",
  ohc_expiry_date: "",
  iloe_insurance_number: "",
  iloe_insurance_expiry_date: "",
  labor_card_number: "",
  labor_card_expiry_date: "",
  medical_insurance_number: "",
  medical_insurance_expiry_date: "",
  part_time_card_number: "",
  part_time_card_expiry_date: "",
};

type TabId = "employee" | "employment" | "documents";

/* ── Modal ────────────────────────────────────────────────────────────────── */

const AddEmployeeModal = ({
  open,
  tenantId,
  userId,
  onClose,
  onSuccess,
}: AddEmployeeModalProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("employee");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [nationalityOpen, setNationalityOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });

  /* Fetch branches when modal opens */
  useEffect(() => {
    if (!open) return;
    supabase
      .from("branch_details")
      .select("branch_id, branch_name, shop_number")
      .eq("tenant_id", tenantId)
      .order("branch_name", { ascending: true })
      .then(({ data }) => setBranches((data as Branch[]) ?? []));
  }, [open, tenantId]);

  /* Auto-sync expiry dates and visa_issued_by */
  useEffect(() => {
    const sub = form.watch((values, { name }) => {
      if (name === "current_visa_expiry_date" && values.current_visa_expiry_date) {
        form.setValue("visa_expiry_date", values.current_visa_expiry_date);
        form.setValue("emirates_id_expiry_date", values.current_visa_expiry_date);
        form.setValue("labor_card_expiry_date", values.current_visa_expiry_date);
      }
      if (name === "assigned_branch_id" && values.assigned_branch_id) {
        form.setValue("visa_branch_id", values.assigned_branch_id);
      }
    });
    return () => sub.unsubscribe();
  }, [form, branches]);

  if (!open) return null;

  /* ── Photo upload ── */
  const handleFileSelect = async (file: File) => {
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${tenantId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("employee-images")
        .upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage
        .from("employee-images")
        .getPublicUrl(path);
      form.setValue("profile_photo_url", publicUrl);
      toast.success("Photo uploaded.");
    } catch {
      toast.error("Failed to upload photo.");
    } finally {
      setUploadingImage(false);
    }
  };

  /* ── Per-tab validation ── */
  const validateTab = (tab: TabId): boolean => {
    const v = form.getValues();
    if (tab === "employee") {
      if (!v.employee_name.trim()) {
        form.setError("employee_name", { message: "Full name is required" });
        return false;
      }
      if (!v.nationality) {
        form.setError("nationality", { message: "Nationality is required" });
        return false;
      }
    }
    if (tab === "employment") {
      if (!v.employment_type) {
        form.setError("employment_type", { message: "Employment type is required" });
        return false;
      }
      if (!v.assigned_branch_id) {
        form.setError("assigned_branch_id", { message: "Assigned branch is required" });
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateTab(activeTab)) return;
    if (activeTab === "employee") setActiveTab("employment");
    else if (activeTab === "employment") setActiveTab("documents");
  };

  const handlePrevious = () => {
    if (activeTab === "employment") setActiveTab("employee");
    else if (activeTab === "documents") setActiveTab("employment");
  };

  const toNum = (s: string) => (s.trim() ? Number(s) : null);
  const toStr = (s: string) => (s.trim() ? s.trim() : null);

  /* ── Submit ── */
  const handleSave = async () => {
    if (!validateTab("employee") || !validateTab("employment")) {
      setActiveTab("employee");
      return;
    }
    const v = form.getValues();
    const visaBranch = branches.find((b) => b.branch_id === v.visa_branch_id);
    const visaIssuedByLabel = visaBranch
      ? visaBranch.shop_number
        ? `${visaBranch.shop_number} – ${visaBranch.branch_name}`
        : visaBranch.branch_name
      : null;
    setSubmitting(true);
    setProgress(10);
    try {
      setProgress(40);
      await createEmployee({
        // Identity
        employee_name: v.employee_name.trim(),
        employee_number: toStr(v.employee_number),
        profile_photo_url: toStr(v.profile_photo_url),
        gender: toStr(v.gender),
        email: toStr(v.email),
        phone: toStr(v.phone),
        nationality: toStr(v.nationality),
        date_of_birth: toStr(v.date_of_birth),
        current_visa_status: toStr(v.current_visa_status),
        current_visa_expiry_date: toStr(v.current_visa_expiry_date),
        notes: toStr(v.notes),
        // Employment
        referred_by: toStr(v.referred_by),
        employment_type: toStr(v.employment_type),
        hire_date: toStr(v.hire_date),
        basic_salary: toNum(v.basic_salary),
        food_allowance: toNum(v.food_allowance),
        ot_amount: toNum(v.ot_amount),
        accommodation_amount: toNum(v.accommodation_amount),
        transport_amount: toNum(v.transport_amount),
        commission_rate: toNum(v.commission_rate),
        position: toStr(v.position),
        assigned_branch_id: toStr(v.assigned_branch_id),
        status: v.status,
        // Documents
        visa_branch_id: toStr(v.visa_branch_id),
        visa_issued_by: visaIssuedByLabel,
        visa_expiry_date: toStr(v.visa_expiry_date),
        passport_number: toStr(v.passport_number),
        passport_expiry_date: toStr(v.passport_expiry_date),
        emirates_id_number: toStr(v.emirates_id_number),
        emirates_id_expiry_date: toStr(v.emirates_id_expiry_date),
        ohc_number: toStr(v.ohc_number),
        ohc_expiry_date: toStr(v.ohc_expiry_date),
        iloe_insurance_number: toStr(v.iloe_insurance_number),
        iloe_insurance_expiry_date: toStr(v.iloe_insurance_expiry_date),
        labor_card_number: toStr(v.labor_card_number),
        labor_card_expiry_date: toStr(v.labor_card_expiry_date),
        medical_insurance_number: toStr(v.medical_insurance_number),
        medical_insurance_expiry_date: toStr(v.medical_insurance_expiry_date),
        part_time_card_number: toStr(v.part_time_card_number),
        part_time_card_expiry_date: toStr(v.part_time_card_expiry_date),
        // System
        tenant_id: tenantId,
        created_by: userId,
        updated_by: userId,
      });
      setProgress(100);
      toast.success("Employee added successfully!");
      form.reset(DEFAULT_VALUES);
      setActiveTab("employee");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add employee.");
    } finally {
      setSubmitting(false);
      setProgress(0);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    form.reset(DEFAULT_VALUES);
    setActiveTab("employee");
    onClose();
  };

  /* ── Render ── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-none">Add New Employee</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Fill in the details across each section</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar (shown while saving) */}
        {submitting && (
          <div className="px-6 pt-3 shrink-0 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Saving employee…</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <Form {...form}>
            <form id="add-emp-form" className="space-y-4">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as TabId)}
              >
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="employee">Employee Details</TabsTrigger>
                  <TabsTrigger value="employment">Employment Details</TabsTrigger>
                  <TabsTrigger value="documents">Document Details</TabsTrigger>
                </TabsList>

                {/* ── Tab 1: Employee Details ── */}
                <TabsContent value="employee" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Full Name */}
                    <FormField
                      control={form.control}
                      name="employee_name"
                      rules={{ required: "Full name is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Ahmed Al-Rashidi" {...field} disabled={submitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Employee Number */}
                    <FormField
                      control={form.control}
                      name="employee_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee Number <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Auto-generated if empty" {...field} disabled={submitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Profile Photo – full width */}
                    <FormField
                      control={form.control}
                      name="profile_photo_url"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Profile Photo</FormLabel>
                          <FormControl>
                            <div>
                              {field.value ? (
                                <div className="relative w-24 h-24">
                                  <img
                                    src={field.value}
                                    alt="Profile"
                                    className="w-full h-full object-cover rounded-xl border border-border"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => form.setValue("profile_photo_url", "")}
                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div
                                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors max-w-sm"
                                  onClick={() => {
                                    const inp = document.createElement("input");
                                    inp.type = "file";
                                    inp.accept = "image/*";
                                    inp.onchange = async (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file) await handleFileSelect(file);
                                    };
                                    inp.click();
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.add("border-primary");
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.classList.remove("border-primary");
                                  }}
                                  onDrop={async (e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove("border-primary");
                                    const file = e.dataTransfer.files?.[0];
                                    if (file?.type.startsWith("image/")) await handleFileSelect(file);
                                  }}
                                >
                                  <Cloud className="w-8 h-8 text-primary mx-auto mb-2" />
                                  <p className="text-sm font-medium text-primary">
                                    {uploadingImage ? "Uploading…" : "Choose file or drag & drop"}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                                </div>
                              )}
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="name@example.com" {...field} disabled={submitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Phone */}
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input
                              inputMode="numeric"
                              placeholder="+971 50 123 4567"
                              {...field}
                              disabled={submitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Nationality (searchable combobox) */}
                    <FormField
                      control={form.control}
                      name="nationality"
                      rules={{ required: "Nationality is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nationality <span className="text-destructive">*</span></FormLabel>
                          <Popover open={nationalityOpen} onOpenChange={setNationalityOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={nationalityOpen}
                                  className="w-full justify-between font-normal h-10"
                                  disabled={submitting}
                                >
                                  {field.value || "Select nationality…"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput
                                  placeholder="Search or type custom…"
                                  onValueChange={(s) => {
                                    if (s && !NATIONALITIES.includes(s)) field.onChange(s);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && field.value) setNationalityOpen(false);
                                  }}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {field.value && !NATIONALITIES.includes(field.value) && (
                                      <div className="p-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full"
                                          onClick={() => setNationalityOpen(false)}
                                        >
                                          Use "{field.value}"
                                        </Button>
                                      </div>
                                    )}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {NATIONALITIES.map((nat) => (
                                      <CommandItem
                                        key={nat}
                                        value={nat}
                                        onSelect={(val) => {
                                          field.onChange(val === field.value ? "" : val);
                                          setNationalityOpen(false);
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", field.value === nat ? "opacity-100" : "opacity-0")} />
                                        {nat}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Gender */}
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={submitting}>
                            <FormControl>
                              <SelectTrigger className="h-10"><SelectValue placeholder="Select gender" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Current Visa Status */}
                    <FormField
                      control={form.control}
                      name="current_visa_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Visa Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={submitting}>
                            <FormControl>
                              <SelectTrigger className="h-10"><SelectValue placeholder="Select visa status" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {VISA_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Visa Expiry Date */}
                    <FormField
                      control={form.control}
                      name="current_visa_expiry_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visa Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Date of Birth */}
                    <FormField
                      control={form.control}
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea rows={3} placeholder="Additional notes…" {...field} disabled={submitting} className="resize-none" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* ── Tab 2: Employment Details ── */}
                <TabsContent value="employment" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Referred By */}
                    <FormField
                      control={form.control}
                      name="referred_by"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Referred By</FormLabel>
                          <FormControl>
                            <Input placeholder="Referrer name" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Employment Type */}
                    <FormField
                      control={form.control}
                      name="employment_type"
                      rules={{ required: "Employment type is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employment Type <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={submitting}>
                            <FormControl>
                              <SelectTrigger className="h-10"><SelectValue placeholder="Select type" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EMPLOYMENT_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Hire Date */}
                    <FormField
                      control={form.control}
                      name="hire_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hire Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Basic Salary */}
                    <FormField
                      control={form.control}
                      name="basic_salary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Basic Salary (AED)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Food Allowance */}
                    <FormField
                      control={form.control}
                      name="food_allowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Food Allowance (AED)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* OT Amount */}
                    <FormField
                      control={form.control}
                      name="ot_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>OT Amount (AED)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Accommodation */}
                    <FormField
                      control={form.control}
                      name="accommodation_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Accommodation (AED)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Transport */}
                    <FormField
                      control={form.control}
                      name="transport_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transport (AED)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Commission Rate */}
                    <FormField
                      control={form.control}
                      name="commission_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commission Rate (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Position */}
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Barber, Manager" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Assigned Branch */}
                    <FormField
                      control={form.control}
                      name="assigned_branch_id"
                      rules={{ required: "Assigned branch is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned Branch <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={submitting}>
                            <FormControl>
                              <SelectTrigger className="h-10"><SelectValue placeholder="Select branch" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {branches.map((b) => (
                                <SelectItem key={b.branch_id} value={b.branch_id}>
                                  {b.shop_number ? `${b.shop_number} – ${b.branch_name}` : b.branch_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Status */}
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={submitting}>
                            <FormControl>
                              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* ── Tab 3: Document Details ── */}
                <TabsContent value="documents" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Visa Issued From (branch select) */}
                    <FormField
                      control={form.control}
                      name="visa_branch_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visa Issued From</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={submitting}>
                            <FormControl>
                              <SelectTrigger className="h-10"><SelectValue placeholder="Select branch" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {branches.map((b) => (
                                <SelectItem key={b.branch_id} value={b.branch_id}>
                                  {b.shop_number ? `${b.shop_number} – ${b.branch_name}` : b.branch_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Visa Expiry Date */}
                    <FormField
                      control={form.control}
                      name="visa_expiry_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visa Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Passport Number */}
                    <FormField
                      control={form.control}
                      name="passport_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passport Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter passport number" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Passport Expiry */}
                    <FormField
                      control={form.control}
                      name="passport_expiry_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passport Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Emirates ID */}
                    <FormField
                      control={form.control}
                      name="emirates_id_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emirates ID Number</FormLabel>
                          <FormControl>
                            <Input placeholder="784-XXXX-XXXXXXX-X" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Emirates ID Expiry */}
                    <FormField
                      control={form.control}
                      name="emirates_id_expiry_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emirates ID Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* OHC */}
                    <FormField
                      control={form.control}
                      name="ohc_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>OHC Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter OHC number" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ohc_expiry_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>OHC Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* ILOE */}
                    <FormField
                      control={form.control}
                      name="iloe_insurance_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ILOE Insurance Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter ILOE number" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="iloe_insurance_expiry_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ILOE Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Labor Card */}
                    <FormField
                      control={form.control}
                      name="labor_card_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Labor Card Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter labor card number" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="labor_card_expiry_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Labor Card Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Medical Insurance */}
                    <FormField
                      control={form.control}
                      name="medical_insurance_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medical Insurance Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter insurance number" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="medical_insurance_expiry_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medical Insurance Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Part Time Card */}
                    <FormField
                      control={form.control}
                      name="part_time_card_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Part Time Card Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter card number" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="part_time_card_expiry_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Part Time Card Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={submitting} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </Form>
        </div>

        {/* Footer – navigation buttons */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
            className="min-w-[80px]"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {activeTab !== "employee" && (
              <Button
                variant="secondary"
                onClick={handlePrevious}
                disabled={submitting}
              >
                Previous
              </Button>
            )}
            {activeTab !== "documents" ? (
              <Button
                onClick={handleNext}
                disabled={submitting}
                className="teal-gradient text-primary-foreground shadow-teal-sm hover:shadow-teal-md active:scale-95 transition-all duration-200"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={submitting}
                className="min-w-[130px] teal-gradient text-primary-foreground shadow-teal-sm hover:shadow-teal-md active:scale-95 transition-all duration-200"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : (
                  "Save Employee"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
