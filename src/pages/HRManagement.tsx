import { useAuth } from "@/contexts/AuthContext";
import { useAddEmployeeModal } from "@/features/hr/AddEmployeeModalContext";
import { useEditEmployeeModal } from "@/features/hr/EditEmployeeModalContext";
import { useFaceEnrollModal } from "@/features/face-recognition/FaceEnrollModalContext";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Plus,
  Building2,
  UserCog,
  FileText,
  MoreVertical,
  ScanFace,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchEmployees, Employee } from "@/features/hr/api";
import { toast } from "sonner";

interface Branch {
  branch_id: string;
  branch_name: string;
  shop_number: string | null;
}

const cardThemes = [
  {
    border: "from-cyan-400 via-blue-500 to-indigo-500",
    glow: "from-cyan-400/45 via-blue-500/35 to-indigo-500/45",
    avatar: "from-cyan-500/20 to-blue-500/20 text-cyan-700",
  },
  {
    border: "from-emerald-400 via-teal-500 to-sky-500",
    glow: "from-emerald-400/40 via-teal-500/30 to-sky-500/40",
    avatar: "from-emerald-500/20 to-teal-500/20 text-emerald-700",
  },
  {
    border: "from-amber-400 via-orange-500 to-rose-500",
    glow: "from-amber-400/40 via-orange-500/30 to-rose-500/40",
    avatar: "from-amber-500/20 to-orange-500/20 text-orange-700",
  },
];

const HRManagement = () => {
  const { user, role, profile, loading } = useAuth();
  const { openAddEmployee } = useAddEmployeeModal();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branchMap, setBranchMap] = useState<Map<string, string>>(new Map());
  const { openEditEmployee } = useEditEmployeeModal();
  const { openEnroll } = useFaceEnrollModal();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (profile?.tenant_id) loadData();
  }, [profile?.tenant_id]);

  const loadData = async () => {
    setFetching(true);
    try {
      const [empData, branchRes] = await Promise.all([
        fetchEmployees(profile!.tenant_id!),
        supabase
          .from("branch_details")
          .select("branch_id, branch_name, shop_number")
          .eq("tenant_id", profile!.tenant_id!),
      ]);
      setEmployees(empData);
      const map = new Map<string, string>();
      for (const b of branchRes.data ?? []) {
        const label = b.shop_number
          ? `${b.shop_number} - ${b.branch_name}`
          : b.branch_name;
        map.set(b.branch_id, label);
      }
      setBranchMap(map);
    } catch {
      toast.error("Failed to load employees");
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role === "superadmin") return <Navigate to="/admin" replace />;

  const filtered = employees.filter((e) => {
    const matchesSearch = e.employee_name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (e.status || "active").toLowerCase() === statusFilter;
    const matchesBranch =
      branchFilter === "all" || e.assigned_branch_id === branchFilter;
    return matchesSearch && matchesStatus && matchesBranch;
  });

  const getInitials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  return (
    <div className="relative min-h-screen mesh-gradient overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute top-1/3 -right-16 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <AppHeader
        title="HR Management"
        subtitle="Manage your employees and workforce"
      />

      <main className="container relative z-10 py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Filters + Add button */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[175px]">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {Array.from(branchMap.entries()).map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 sm:ml-auto">
              <Button
                variant="outline"
                className="gap-2 border-border hover:border-primary/30 active:scale-95 transition-all duration-200"
              >
                <FileText className="w-4 h-4" /> Employees Records
              </Button>
              <Button
                onClick={() => openAddEmployee(loadData)}
                className="teal-gradient text-primary-foreground gap-2 shadow-teal-sm hover:shadow-teal-md active:scale-95 transition-all duration-200"
              >
                <Plus className="w-4 h-4" /> Add Employee
              </Button>
            </div>
          </div>

          {/* Employee Cards Grid */}
          {fetching ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center shadow-teal-sm">
              <UserCog className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No employees found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((emp, i) => {
                const isActive = (emp.status || "active").toLowerCase() === "active";
                const branchName = emp.assigned_branch_id
                  ? (branchMap.get(emp.assigned_branch_id) ?? "-")
                  : "-";
                const theme = cardThemes[i % cardThemes.length];

                return (
                  <motion.div
                    key={emp.employee_id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className={`group relative rounded-2xl bg-gradient-to-br p-px transition-all duration-300 hover:-translate-y-0.5 ${theme.border}`}
                  >
                    <div
                      className={`pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-55 ${theme.glow}`}
                    />

                    <div className="relative rounded-2xl border border-white/50 bg-card shadow-sm transition-shadow duration-300 group-hover:shadow-lg">
                      {/* Card Header */}
                      <div className="p-5 pb-3">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="relative shrink-0 mt-0.5">
                            <div
                              className={`w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center ${theme.avatar}`}
                            >
                              <span className="text-sm font-bold">
                                {getInitials(emp.employee_name)}
                              </span>
                            </div>
                            {emp.face_image_url && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" title="Face enrolled" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-foreground text-base leading-tight truncate">
                              {emp.employee_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {emp.position && (
                                <span className="text-[11px] text-muted-foreground font-medium">
                                  {emp.position}
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isActive
                                    ? "bg-primary/10 text-primary"
                                    : "bg-destructive/10 text-destructive"
                                }`}
                              >
                                {isActive ? "ACTIVE" : "INACTIVE"}
                              </span>
                            </div>
                          </div>
                          {/* Three-dot menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem className="gap-2 cursor-pointer text-[13px]">
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer text-[13px]"
                                onClick={() =>
                                  openEditEmployee(emp.employee_id, loadData)
                                }
                              >
                                Edit Employee
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer text-[13px]"
                                onClick={() =>
                                  openEnroll(
                                    { employeeId: emp.employee_id, employeeName: emp.employee_name },
                                    loadData
                                  )
                                }
                              >
                                <ScanFace className="w-3.5 h-3.5" />
                                Enroll Face
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 cursor-pointer text-[13px] text-destructive focus:text-destructive">
                                Archive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Info rows */}
                      <div className="px-5 pb-4 space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Building2 className="w-4 h-4 shrink-0" />
                          <span className="truncate">{branchName}</span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border mx-5" />

                      {/* Stats row 1 - salary, type, nationality */}
                      <div className="px-5 py-4 flex items-center justify-between">
                        <div className="text-center flex-1">
                          <p className="text-base font-bold text-primary">
                            {emp.basic_salary != null
                              ? `AED ${emp.basic_salary.toLocaleString()}`
                              : "-"}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium">
                            Salary
                          </p>
                        </div>
                        <div className="text-center flex-1">
                          <p className="text-base font-bold text-foreground leading-tight">
                            {emp.employment_type ?? "-"}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium">
                            Type
                          </p>
                        </div>
                        <div className="text-center flex-1">
                          <p className="text-base font-bold text-foreground">
                            {emp.nationality ?? "-"}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium">
                            Nationality
                          </p>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border mx-5" />

                      {/* Stats row 2 - loan amounts */}
                      <div className="px-5 py-4 flex items-center justify-between">
                        <div className="text-center flex-1">
                          <p className="text-sm font-bold text-foreground">
                            {emp.outstanding_loan_amount != null
                              ? `AED ${emp.outstanding_loan_amount.toLocaleString()}`
                              : "-"}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">
                            Outstanding Loan
                          </p>
                        </div>
                        <div className="text-center flex-1">
                          <p className="text-sm font-bold text-foreground">
                            {emp.loan_balance != null
                              ? `AED ${emp.loan_balance.toLocaleString()}`
                              : "-"}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">
                            Loan Balance
                          </p>
                        </div>
                        <div className="text-center flex-1">
                          <p className="text-sm font-bold text-foreground">
                            {emp.visa_charges_bal != null
                              ? `AED ${emp.visa_charges_bal.toLocaleString()}`
                              : "-"}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">
                            Visa Charges
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>

      <footer className="container pb-6">
        <p className="text-[10px] text-muted-foreground/60 font-mono text-center">
          Super Salon v1.0 - Multi-Tenant Salon Management
        </p>
      </footer>
    </div>
  );
};

export default HRManagement;
