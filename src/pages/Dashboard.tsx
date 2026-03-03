import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Store, Calendar, TrendingUp } from "lucide-react";
import AppHeader from "@/components/AppHeader";

const Dashboard = () => {
  const { user, role, profile, loading } = useAuth();

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
    { label: "Active Staff",          value: "5",  icon: Users,    color: "text-accent" },
    { label: "Revenue (Today)",       value: "$480", icon: TrendingUp, color: "text-primary" },
    { label: "Walk-ins",              value: "3",  icon: Store,    color: "text-accent" },
  ];

  return (
    <div className="min-h-screen mesh-gradient">
      <AppHeader
        title="Dashboard"
        subtitle={`Welcome back, ${profile?.full_name || "there"}!`}
      />

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
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
