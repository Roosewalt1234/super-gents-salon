import { useState, useEffect } from "react";
import { UserPlus, Mail, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface TenantUser {
  id: string;
  user_id: string;
  full_name: string | null;
  role: string;
  email?: string;
}

interface TenantAdminManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
}

const TenantAdminManager = ({ open, onOpenChange, tenant }: TenantAdminManagerProps) => {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "tenant_admin" as string });

  useEffect(() => {
    if (open) fetchTenantUsers();
  }, [open, tenant.id]);

  const fetchTenantUsers = async () => {
    setLoading(true);
    // Get profiles linked to this tenant
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, user_id, full_name")
      .eq("tenant_id", tenant.id);

    if (profiles && profiles.length > 0) {
      // Get roles for these users
      const userIds = profiles.map((p) => p.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

      setUsers(
        profiles.map((p) => ({
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name,
          role: roleMap.get(p.user_id) || "staff",
        }))
      );
    } else {
      setUsers([]);
    }
    setLoading(false);
  };

  const createTenantUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      toast.error("Email and password are required");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke("manage-tenant-user", {
        body: {
          action: "create",
          tenant_id: tenant.id,
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          role: form.role,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success("User created and assigned to tenant!");
        setForm({ email: "", password: "", full_name: "", role: "tenant_admin" });
        fetchTenantUsers();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    }
    setCreating(false);
  };

  const removeUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ tenant_id: null })
        .eq("user_id", userId);

      if (error) throw error;
      toast.success("User removed from tenant");
      fetchTenantUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove user");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass rounded-[2.5rem] border-border shadow-teal-lg sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Manage Users — {tenant.name}
          </DialogTitle>
        </DialogHeader>

        {/* Current Users */}
        <div className="space-y-3 mt-4">
          <h3 className="text-sm font-semibold text-foreground">Current Users</h3>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No users assigned to this tenant.</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.full_name || "Unnamed"}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      u.role === "tenant_admin" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                    }`}>
                      {u.role.replace("_", " ")}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeUser(u.user_id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create User Form */}
        <div className="border-t border-border pt-4 mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" /> Create & Assign New User
          </h3>
          <form onSubmit={createTenantUser} className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Full Name *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="John Doe"
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@salon.com"
                required
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Password *</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              disabled={creating}
              className="w-full teal-gradient text-primary-foreground transition-all duration-200 active:scale-95"
            >
              {creating ? "Creating..." : "Create User"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TenantAdminManager;
