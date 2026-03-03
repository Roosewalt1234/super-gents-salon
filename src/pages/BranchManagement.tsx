import { useAuth } from "@/contexts/AuthContext";
import { useAddBranchModal } from "@/features/branch/BranchModalContext";
import { useManageServicesModal } from "@/features/manage-services/ManageServicesModalContext";
import { useBranchSettingsModal } from "@/features/branch-settings/BranchSettingsModalContext";
import { useBranchBarbersModal } from "@/features/branch-barbers/BranchBarbersModalContext";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin,
  Phone,
  Search,
  Plus,
  Wrench,
  Users,
  Settings,
  MoreVertical,
  DollarSign,
  ReceiptText,
  BarChart2,
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
import { toast } from "sonner";

interface Branch {
  branch_id: string;
  branch_name: string;
  shop_number: string | null;
  location: string | null;
  phone: string | null;
  status: string | null;
  services_count: number | null;
  barbers_count: number | null;
  tenant_id: string;
}

const branchLabel = (b: Branch) =>
  b.shop_number ? `${b.shop_number} - ${b.branch_name}` : b.branch_name;

const BranchManagement = () => {
  const { user, role, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { openAddBranch } = useAddBranchModal();
  const { openManageServices } = useManageServicesModal();
  const { openBranchSettings } = useBranchSettingsModal();
  const { openBranchBarbers } = useBranchBarbersModal();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (profile?.tenant_id) fetchBranches();
  }, [profile?.tenant_id]);

  const fetchBranches = async () => {
    setFetching(true);
    const [branchRes, activeRes, employeeRes] = await Promise.all([
      supabase
        .from("branch_details")
        .select("branch_id, branch_name, shop_number, location, phone, status, tenant_id")
        .eq("tenant_id", profile!.tenant_id!)
        .order("branch_name", { ascending: true }),
      supabase
        .from("branches_active_services")
        .select("branch_id")
        .eq("tenant_id", profile!.tenant_id!)
        .eq("is_active", true),
      supabase
        .from("employees")
        .select("assigned_branch_id")
        .eq("tenant_id", profile!.tenant_id!)
        .neq("is_archived", true)
        .not("assigned_branch_id", "is", null),
    ]);

    if (branchRes.error) {
      toast.error("Failed to load branches");
      setFetching(false);
      return;
    }

    const servicesCountMap = new Map<string, number>();
    for (const row of activeRes.data ?? []) {
      servicesCountMap.set(row.branch_id, (servicesCountMap.get(row.branch_id) ?? 0) + 1);
    }

    const barbersCountMap = new Map<string, number>();
    for (const row of employeeRes.data ?? []) {
      if (row.assigned_branch_id) {
        barbersCountMap.set(row.assigned_branch_id, (barbersCountMap.get(row.assigned_branch_id) ?? 0) + 1);
      }
    }

    setBranches(
      (branchRes.data ?? []).map((b) => ({
        ...b,
        services_count: servicesCountMap.get(b.branch_id) ?? 0,
        barbers_count: barbersCountMap.get(b.branch_id) ?? 0,
      }))
    );
    setFetching(false);
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

  const filtered = branches.filter((b) => {
    const q = search.toLowerCase();
    const matchesSearch =
      b.branch_name.toLowerCase().includes(q) ||
      (b.shop_number ?? "").toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "all" ||
      (b.status || "active").toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen mesh-gradient">
      <AppHeader
        title="Branch Management"
        subtitle="Manage all your branches and settings"
      />

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Filters + Add button */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search branches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => openAddBranch(fetchBranches)}
              className="teal-gradient text-primary-foreground gap-2 shadow-teal-sm hover:shadow-teal-md active:scale-95 transition-all duration-200 sm:ml-auto"
            >
              <Plus className="w-4 h-4" /> Add New Branch
            </Button>
          </div>

          {/* Branch Cards Grid */}
          {fetching ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center shadow-teal-sm">
              <p className="text-muted-foreground">No branches found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((branch, i) => (
                <motion.div
                  key={branch.branch_id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="bg-card rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow"
                >
                  {/* Card Header */}
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mt-0.5 shrink-0">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-foreground text-base leading-tight">
                            {branchLabel(branch)}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1.5 ${
                              (branch.status || "active").toLowerCase() === "active"
                                ? "bg-primary/10 text-primary"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {(branch.status || "Active").toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem className="gap-3 cursor-pointer">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            View Barbers
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-3 cursor-pointer">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            View Today's Sales
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-3 cursor-pointer">
                            <ReceiptText className="w-4 h-4 text-muted-foreground" />
                            View Today's Expenses
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-3 cursor-pointer">
                            <BarChart2 className="w-4 h-4 text-muted-foreground" />
                            Summary
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Location & Phone */}
                  <div className="px-5 pb-4 space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="truncate">{branch.location || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Phone className="w-4 h-4 shrink-0" />
                      <span>{branch.phone || "—"}</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border mx-5" />

                  {/* Stats */}
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-xl font-bold text-primary">{branch.services_count ?? 0}</p>
                      <p className="text-xs text-muted-foreground font-medium">Services</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-xl font-bold text-primary">{branch.barbers_count ?? 0}</p>
                      <p className="text-xs text-muted-foreground font-medium">Barbers</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-xl font-bold text-foreground">AED 0</p>
                      <p className="text-xs text-muted-foreground font-medium">Revenue</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border mx-5" />

                  {/* Actions */}
                  <div className="p-4 space-y-2">
                    <button
                      onClick={() => openManageServices(branch.branch_id, branchLabel(branch))}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:border-primary/30 hover:shadow-sm transition-all duration-200 active:scale-[0.98]"
                    >
                      <Wrench className="w-4 h-4" /> Manage Services
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openBranchBarbers(branch.branch_id, branchLabel(branch), fetchBranches)}
                        className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:border-primary/30 hover:shadow-sm transition-all duration-200 active:scale-[0.98]"
                      >
                        <Users className="w-4 h-4" /> Barbers
                      </button>
                      <button
                        onClick={() => openBranchSettings(branch.branch_id, branchLabel(branch), fetchBranches)}
                        className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:border-primary/30 hover:shadow-sm transition-all duration-200 active:scale-[0.98] w-full"
                      >
                        <Settings className="w-4 h-4" /> Settings
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      <footer className="container pb-6">
        <p className="text-[10px] text-muted-foreground/60 font-mono text-center">
          Super Salon v1.0 • Multi-Tenant Salon Management
        </p>
      </footer>
    </div>
  );
};

export default BranchManagement;
