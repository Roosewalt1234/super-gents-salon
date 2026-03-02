import { motion } from "framer-motion";
import { Store, Users, UserCheck, TrendingUp } from "lucide-react";

interface Tenant {
  id: string;
  is_active: boolean;
}

interface AdminDashboardStatsProps {
  tenants: Tenant[];
  totalUsers: number;
}

const AdminDashboardStats = ({ tenants, totalUsers }: AdminDashboardStatsProps) => {
  const activeTenants = tenants.filter((t) => t.is_active).length;
  const inactiveTenants = tenants.filter((t) => !t.is_active).length;

  const stats = [
    { label: "Total Tenants", value: tenants.length.toString(), icon: Store, color: "text-primary" },
    { label: "Active Tenants", value: activeTenants.toString(), icon: TrendingUp, color: "text-primary" },
    { label: "Inactive Tenants", value: inactiveTenants.toString(), icon: Store, color: "text-destructive" },
    { label: "Total Users", value: totalUsers.toString(), icon: Users, color: "text-accent" },
  ];

  return (
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
  );
};

export default AdminDashboardStats;
