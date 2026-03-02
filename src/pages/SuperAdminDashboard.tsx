import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Scissors, LogOut, LayoutDashboard, Store, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminDashboardStats from "@/components/admin/AdminDashboardStats";
import TenantList from "@/components/admin/TenantList";

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

const SuperAdminDashboard = () => {
  const { user, role, profile, loading, signOut } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeNav, setActiveNav] = useState("dashboard");

  const navItems = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard, title: "Admin Dashboard", subtitle: "Platform overview and analytics" },
    { id: "tenants", label: "Tenant Management", icon: Store, title: "Tenant Management", subtitle: "Create and manage salon tenants" },
    { id: "settings", label: "Settings", icon: Settings, title: "Settings", subtitle: "Platform configuration" },
  ];

  const activeItem = navItems.find((item) => item.id === activeNav);

  useEffect(() => {
    if (role === "superadmin") {
      fetchTenants();
      fetchUserCount();
    }
  }, [role]);

  const fetchTenants = async () => {
    const { data } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTenants(data as Tenant[]);
  };

  const fetchUserCount = async () => {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    setTotalUsers(count ?? 0);
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

  return (
    <div className="min-h-screen mesh-gradient">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl teal-gradient flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">Super Salon</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider">
                Admin
              </span>
            </div>
            {activeItem && (
              <div className="border-l border-border pl-6 hidden sm:block">
                <h1 className="text-lg font-bold text-foreground leading-tight">{activeItem.title}</h1>
                <p className="text-sm text-muted-foreground">{activeItem.subtitle}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile?.full_name || user.email}
            </span>
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
        {/* Navigation */}
        <div className="border-t border-border">
          <div className="container flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeNav === item.id
                    ? "bg-primary text-primary-foreground shadow-teal-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container py-8">
        {activeNav === "dashboard" && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <AdminDashboardStats tenants={tenants} totalUsers={totalUsers} />
            <div className="glass rounded-2xl p-6 shadow-teal-sm">
              <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Add Tenant", action: () => setActiveNav("tenants") },
                  { label: "View All Tenants", action: () => setActiveNav("tenants") },
                  { label: "Manage Services", action: () => {} },
                  { label: "Platform Settings", action: () => setActiveNav("settings") },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="rounded-xl border border-border bg-card p-4 text-sm font-medium text-foreground hover:border-primary/30 hover:shadow-teal-sm transition-all duration-200 active:scale-95"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeNav === "tenants" && (
          <TenantList tenants={tenants} userId={user.id} onRefresh={fetchTenants} />
        )}

        {activeNav === "settings" && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="glass rounded-2xl p-6 shadow-teal-sm">
              <h2 className="text-lg font-bold text-foreground mb-2">Platform Settings</h2>
              <p className="text-sm text-muted-foreground">Settings module coming soon.</p>
            </div>
          </motion.div>
        )}
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
