import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Scissors, Users, Store, LogOut, Plus, ToggleLeft, ToggleRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
}

const SuperAdminDashboard = () => {
  const { user, role, loading, signOut } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", email: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (role === "superadmin") fetchTenants();
  }, [role]);

  const fetchTenants = async () => {
    const { data } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTenants(data as Tenant[]);
  };

  const createTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("tenants").insert({
      name: form.name,
      slug: form.slug,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      owner_id: user?.id,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Tenant created!");
      setForm({ name: "", slug: "", email: "", phone: "", address: "" });
      setDialogOpen(false);
      fetchTenants();
    }
  };

  const toggleTenant = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from("tenants")
      .update({ is_active: !active })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Tenant ${active ? "deactivated" : "activated"}`);
      fetchTenants();
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
  if (role !== "superadmin") return <Navigate to="/dashboard" replace />;

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen mesh-gradient">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl teal-gradient flex items-center justify-center">
              <Scissors className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Super Salon</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Tenant Management</h1>
              <p className="text-muted-foreground text-sm mt-1">{tenants.length} total tenants</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="teal-gradient text-primary-foreground transition-all duration-200 active:scale-95 shadow-teal-sm hover:shadow-teal-md gap-2">
                  <Plus className="w-4 h-4" /> Add Tenant
                </Button>
              </DialogTrigger>
              <DialogContent className="glass rounded-[2.5rem] border-border shadow-teal-lg sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Create New Tenant</DialogTitle>
                </DialogHeader>
                <form onSubmit={createTenant} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label className="text-foreground text-sm">Salon Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Elite Barbers"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-sm">Slug *</Label>
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                      placeholder="elite-barbers"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-sm">Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="contact@salon.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-sm">Phone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+1 555 0100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-sm">Address</Label>
                    <Input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="123 Main St"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full teal-gradient text-primary-foreground transition-all duration-200 active:scale-95"
                  >
                    {saving ? "Creating..." : "Create Tenant"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <div className="relative mb-6 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tenants Table */}
          <div className="glass rounded-2xl shadow-teal-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="table-header text-left p-4">Salon</th>
                    <th className="table-header text-left p-4 hidden md:table-cell">Slug</th>
                    <th className="table-header text-left p-4 hidden lg:table-cell">Email</th>
                    <th className="table-header text-left p-4 hidden lg:table-cell">Phone</th>
                    <th className="table-header text-center p-4">Status</th>
                    <th className="table-header text-center p-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tenant, i) => (
                    <motion.tr
                      key={tenant.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Store className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-semibold text-sm text-foreground">{tenant.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground hidden md:table-cell font-mono">{tenant.slug}</td>
                      <td className="p-4 text-sm text-muted-foreground hidden lg:table-cell">{tenant.email || "—"}</td>
                      <td className="p-4 text-sm text-muted-foreground hidden lg:table-cell">{tenant.phone || "—"}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            tenant.is_active
                              ? "bg-primary/10 text-primary"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {tenant.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTenant(tenant.id, tenant.is_active)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {tenant.is_active ? (
                            <ToggleRight className="w-5 h-5 text-primary" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                        No tenants found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="container pb-6">
        <p className="text-[10px] text-muted-foreground/60 font-mono text-center">
          Super Salon v1.0 • Super Admin Panel
        </p>
      </footer>
    </div>
  );
};

export default SuperAdminDashboard;
