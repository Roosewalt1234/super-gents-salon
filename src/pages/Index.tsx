import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Scissors, ArrowRight, Shield, Store, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const features = [
    { icon: Store, title: "Multi-Tenant", desc: "Each salon gets its own isolated workspace" },
    { icon: Users, title: "Staff Management", desc: "Manage barbers, schedules, and assignments" },
    { icon: Shield, title: "Role-Based Access", desc: "Super admin, tenant admin, and staff roles" },
  ];

  return (
    <div className="min-h-screen mesh-gradient flex flex-col">
      {/* Nav */}
      <header className="glass border-b border-border sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl teal-gradient flex items-center justify-center">
              <Scissors className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Super Salon</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" className="text-sm text-foreground">Log In</Button>
            </Link>
            <Link to="/signup">
              <Button className="teal-gradient text-primary-foreground text-sm transition-all duration-200 active:scale-95 shadow-teal-sm hover:shadow-teal-md">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center">
        <div className="container py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
              <Scissors className="w-3.5 h-3.5" />
              Multi-Tenant Salon Platform
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-foreground leading-tight max-w-3xl mx-auto">
              Manage Your{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Gents Salon
              </span>{" "}
              Like a Pro
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl mt-6 max-w-xl mx-auto">
              All-in-one platform for managing appointments, staff, and revenue across multiple salon locations.
            </p>
            <div className="flex items-center justify-center gap-3 mt-8">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="teal-gradient text-primary-foreground transition-all duration-200 active:scale-95 shadow-teal-md hover:shadow-teal-lg gap-2"
                >
                  Start Free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20 max-w-3xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
                className="glass rounded-2xl p-6 text-left shadow-teal-sm hover:shadow-teal-md transition-shadow"
              >
                <f.icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="container pb-6">
        <p className="text-[10px] text-muted-foreground/60 font-mono text-center">
          © 2026 Super Salon • Built for Modern Barbershops
        </p>
      </footer>
    </div>
  );
};

export default Index;
