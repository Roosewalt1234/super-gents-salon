import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Branch {
  branch_id: string;
  branch_name: string;
  location: string | null;
  phone: string | null;
  status: string | null;
  services_count: number | null;
  barbers_count: number | null;
  tenant_id: string;
}

const BranchManagement = () => {
  const { user, role, profile, loading } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (profile?.tenant_id) fetchBranches();
  }, [profile?.tenant_id]);

  const fetchBranches = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from("branch_details")
      .select(
        "branch_id, branch_name, location, phone, status, services_count, barbers_count, tenant_id"
      )
      .eq("tenant_id", profile!.tenant_id!)
      .order("branch_name", { ascending: true });

    if (error) {
      toast.error("Failed to load branches");
    } else {
      setBranches(data || []);
    }
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

  const filtered = branches.filter((b) => {
    const matchesSearch = b.branch_name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (b.status || "active").toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="py-8">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Filters */}
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
                className="glass rounded-2xl shadow-teal-sm hover:shadow-teal-md transition-shadow"
              >
                {/* Card Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5 shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground text-sm leading-tight truncate">
                          {branch.branch_name}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1.5 ${
                            (branch.status || "active").toLowerCase() ===
                            "active"
                              ? "bg-primary/10 text-primary"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {(branch.status || "Active").toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Location & Phone */}
                <div className="px-5 pb-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {branch.location || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{branch.phone || "—"}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border mx-5" />

                {/* Stats */}
                <div className="px-5 py-3 flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">
                      {branch.services_count ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      Services
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">
                      {branch.barbers_count ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      Barbers
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">AED 0</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      Revenue
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border mx-5" />

                {/* Actions */}
                <div className="p-4 space-y-2">
                  <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-xs font-medium text-foreground hover:border-primary/30 hover:shadow-teal-sm transition-all duration-200 active:scale-[0.98]">
                    <Wrench className="w-3.5 h-3.5" /> Manage Services
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-xs font-medium text-foreground hover:border-primary/30 hover:shadow-teal-sm transition-all duration-200 active:scale-[0.98]">
                      <Users className="w-3.5 h-3.5" /> Barbers
                    </button>
                    <button className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-xs font-medium text-foreground hover:border-primary/30 hover:shadow-teal-sm transition-all duration-200 active:scale-[0.98]">
                      <Settings className="w-3.5 h-3.5" /> Settings
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default BranchManagement;
