import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Scissors, Users, Store, Calendar, TrendingUp, LogOut, LayoutDashboard, UserCog, Calculator, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const Dashboard = () => {
  const { user, role, profile, loading, signOut } = useAuth();
  const [activeNav, setActiveNav] = useState("dashboard");

  const navItems = [
    { id: "dashboard", label: "Management Dashboard", icon: LayoutDashboard },
    { id: "branch", label: "Branch Management", icon: Store },
    { id: "hr", label: "HR Management", icon: UserCog },
    { id: "accounting", label: "Accounting", icon: Calculator },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role === "superadmin") return <Navigate to="/admin" replace />;

  const stats = [
    { label: "Today's Appointments", value: "12", icon: Calendar, color: "text-primary" },
    { label: "Active Staff", value: "5", icon: Users, color: "text-accent" },
    { label: "Revenue (Today)", value: "$480", icon: TrendingUp, color: "text-primary" },
    { label: "Walk-ins", value: "3", icon: Store, color: "text-accent" },
  ];

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
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
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
        {/* Navigation Bar */}
        <div className="border-t border-border">
          <div className="container flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeNav === item.id
                    ? "bg-primary text-primary-foreground shadow-teal-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl font-bold text-foreground mb-1">Dashboard</h1>
          <p className="text-muted-foreground mb-8">Welcome back, {profile?.full_name || "there"}!</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="glass rounded-2xl p-6 shadow-teal-sm hover:shadow-teal-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="glass rounded-2xl p-6 shadow-teal-sm">
            <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["New Appointment", "Add Walk-in", "View Schedule", "Reports"].map((action) => (
                <button
                  key={action}
                  className="rounded-xl border border-border bg-card p-4 text-sm font-medium text-foreground hover:border-primary/30 hover:shadow-teal-sm transition-all duration-200 active:scale-95"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
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

export default Dashboard;
