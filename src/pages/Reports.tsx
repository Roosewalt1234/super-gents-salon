import { useMemo, type ComponentType } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CreditCard,
  Receipt,
  ShoppingCart,
  Tags,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

type ReportCard = {
  id: string;
  title: string;
  description: string;
  route: string;
  source: string;
  icon: ComponentType<{ className?: string }>;
};

const reportCardThemes = [
  {
    border: "from-cyan-400 via-blue-500 to-indigo-500",
    glow: "from-cyan-400/45 via-blue-500/35 to-indigo-500/45",
    iconBg: "from-cyan-500/20 to-blue-500/20 text-cyan-700",
  },
  {
    border: "from-emerald-400 via-teal-500 to-sky-500",
    glow: "from-emerald-400/40 via-teal-500/30 to-sky-500/40",
    iconBg: "from-emerald-500/20 to-teal-500/20 text-emerald-700",
  },
  {
    border: "from-amber-400 via-orange-500 to-rose-500",
    glow: "from-amber-400/40 via-orange-500/30 to-rose-500/40",
    iconBg: "from-amber-500/20 to-orange-500/20 text-orange-700",
  },
];

const Reports = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  const reportCards = useMemo<ReportCard[]>(
    () => [
      {
        id: "sales-register",
        title: "Sales Register Report",
        description: "Detailed sales transactions with date range and branch filters. Export as CSV.",
        route: "/sales_register",
        source: "Sales Register",
        icon: ShoppingCart,
      },
      {
        id: "sales-branch",
        title: "Branch-wise Sales Report",
        description: "Analyze sales per branch by applying the branch filter and exporting CSV.",
        route: "/sales_register",
        source: "Sales Register",
        icon: Building2,
      },
      {
        id: "sales-payment",
        title: "Payment-wise Sales Report",
        description: "Review cash vs card sales from payment method data and export CSV.",
        route: "/sales_register",
        source: "Sales Register",
        icon: CreditCard,
      },
      {
        id: "expenses-register",
        title: "Expenses Register Report",
        description: "Detailed expense records with date, branch, and category filters. Export as CSV.",
        route: "/expenses_register",
        source: "Expenses Register",
        icon: Receipt,
      },
      {
        id: "expenses-category",
        title: "Category-wise Expense Report",
        description: "Break down expenses by category or sub-category, then export as CSV.",
        route: "/expenses_register",
        source: "Expenses Register",
        icon: Tags,
      },
      {
        id: "expenses-branch",
        title: "Branch-wise Expense Report",
        description: "Track branch expense patterns by using branch filters and exporting CSV.",
        route: "/expenses_register",
        source: "Expenses Register",
        icon: Building2,
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role !== "tenant_admin" && role !== "superadmin") return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Reports"
        subtitle="Generate operational and accounting reports from one place"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-6"
        >
          <h2 className="text-xl font-bold text-foreground">Available Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Open any report card to apply filters and export the report data.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {reportCards.map((report, index) => {
            const theme = reportCardThemes[index % reportCardThemes.length];

            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
                className={`group relative rounded-2xl bg-gradient-to-br p-px transition-all duration-300 hover:-translate-y-0.5 ${theme.border}`}
              >
                <div
                  className={`pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-55 ${theme.glow}`}
                />
                <div className="relative rounded-2xl border border-white/50 bg-card p-5 flex flex-col shadow-sm transition-shadow duration-300 group-hover:shadow-lg">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 ${theme.iconBg}`}
                  >
                    <report.icon className="w-5 h-5" />
                  </div>

                  <h3 className="text-base font-semibold text-foreground">{report.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 flex-1">{report.description}</p>

                  <div className="mt-4 mb-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      Source: {report.source}
                    </span>
                  </div>

                  <Button
                    onClick={() => navigate(report.route)}
                    className="w-full gap-2 teal-gradient text-primary-foreground shadow-teal-sm hover:shadow-teal-md"
                  >
                    Open Report
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Reports;
