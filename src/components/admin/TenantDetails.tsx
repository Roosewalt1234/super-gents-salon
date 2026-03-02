import { useState, useEffect } from "react";
import { Store, MapPin, Mail, Phone, Calendar, Users, GitBranch } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  owner_id: string | null;
}

interface TenantDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
}

const TenantDetails = ({ open, onOpenChange, tenant }: TenantDetailsProps) => {
  const [branchCount, setBranchCount] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);

  useEffect(() => {
    if (open) fetchStats();
  }, [open, tenant.id]);

  const fetchStats = async () => {
    const [branches, employees, admins] = await Promise.all([
      supabase.from("branch_details").select("branch_id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("employees").select("employee_id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    ]);
    setBranchCount(branches.count ?? 0);
    setEmployeeCount(employees.count ?? 0);
    setAdminCount(admins.count ?? 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass rounded-[2.5rem] border-border shadow-teal-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            {tenant.name}
            <span
              className={`ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                tenant.is_active ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              }`}
            >
              {tenant.is_active ? "Active" : "Inactive"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoItem icon={Store} label="Slug" value={tenant.slug} mono />
            <InfoItem icon={Calendar} label="Created" value={new Date(tenant.created_at).toLocaleDateString()} />
            <InfoItem icon={Mail} label="Email" value={tenant.email || "—"} />
            <InfoItem icon={Phone} label="Phone" value={tenant.phone || "—"} />
          </div>
          {tenant.address && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground rounded-lg border border-border p-3">
              <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <span>{tenant.address}</span>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Branches" value={branchCount} icon={GitBranch} />
            <StatCard label="Employees" value={employeeCount} icon={Users} />
            <StatCard label="Users" value={adminCount} icon={Users} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InfoItem = ({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) => (
  <div className="rounded-lg border border-border p-3">
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className="w-3 h-3 text-primary" />
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{label}</span>
    </div>
    <p className={`text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value}</p>
  </div>
);

const StatCard = ({ label, value, icon: Icon }: { label: string; value: number; icon: any }) => (
  <div className="rounded-xl bg-primary/5 p-4 text-center">
    <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
    <p className="text-xl font-bold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{label}</p>
  </div>
);

export default TenantDetails;
