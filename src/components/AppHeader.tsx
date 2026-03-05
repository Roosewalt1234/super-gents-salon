import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import {
  Scissors,
  LayoutDashboard,
  Store,
  UserCog,
  Calculator,
  Settings,
  Wrench,
  ChevronDown,
  LogOut,
  User,
  Wallet,
  ScanFace,
  CalendarCheck,
  ShoppingCart,
  Receipt,
  CreditCard,
  TrendingUp,
  BadgePercent,
  BarChart2,
  Sun,
  Moon,
  Shield,
  SlidersHorizontal,
  Monitor,
  Users,
  Tag,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  title: string;
  subtitle: string;
}

const NAV_ITEMS = [
  { id: "dashboard",   label: "Dashboard",   icon: LayoutDashboard, path: "/dashboard",         isDropdown: false },
  { id: "branches",    label: "Branches",    icon: Store,           path: "/branch_management", isDropdown: false },
  { id: "hr",          label: "HR Management", icon: UserCog,       path: null,                 isDropdown: true  },
  { id: "accounting",  label: "Accounting",  icon: Calculator,      path: null,                 isDropdown: true  },
  { id: "reports",     label: "Reports",     icon: BarChart2,       path: "/reports",           isDropdown: false },
  { id: "settings",    label: "Settings",    icon: Settings,        path: null,                 isDropdown: true  },
] as const;

type NavId = (typeof NAV_ITEMS)[number]["id"];

const resolveActiveId = (pathname: string): NavId => {
  if (pathname === "/branch_management")    return "branches";
  if (pathname.startsWith("/hr"))           return "hr";
  if (pathname.startsWith("/payroll"))      return "hr";
  if (pathname.startsWith("/attendance"))   return "hr";
  if (pathname.startsWith("/face"))         return "hr";
  if (pathname.startsWith("/sales"))        return "accounting";
  if (pathname.startsWith("/expenses"))     return "accounting";
  if (pathname.startsWith("/accounts"))     return "accounting";
  if (pathname.startsWith("/cash_flow"))    return "accounting";
  if (pathname.startsWith("/tax"))          return "accounting";
  if (pathname.startsWith("/reports"))      return "reports";
  if (pathname === "/services")             return "settings";
  if (pathname.startsWith("/shop"))         return "settings";
  if (pathname.startsWith("/kiosk"))        return "settings";
  if (pathname.startsWith("/user_perm"))    return "settings";
  if (pathname.startsWith("/expense_cat"))  return "settings";
  return "dashboard";
};

const AppHeader = ({ title, subtitle }: AppHeaderProps) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const activeId = resolveActiveId(useLocation().pathname);
  const { isDark, toggle: toggleTheme } = useTheme();

  const navBase =
    "flex items-center gap-2 px-3.5 py-1.5 rounded text-[13px] font-medium transition-all duration-150 whitespace-nowrap select-none outline-none";
  const navActive =
    "bg-primary text-primary-foreground font-semibold shadow-sm";
  const navIdle =
    "text-muted-foreground hover:text-foreground hover:bg-accent/80 active:scale-[0.97]";

  return (
    <header className="sticky top-0 z-50 glass border-b border-border">
      {/* ── Top bar ── */}
      <div className="container flex h-14 items-center justify-between gap-4">

        {/* Left: logo + page label */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="w-8 h-8 rounded-lg teal-gradient flex items-center justify-center group-hover:opacity-90 transition-opacity">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground tracking-tight text-sm hidden sm:block">
              Super Salon
            </span>
          </button>

          <div className="h-5 w-px bg-border shrink-0" />

          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-none truncate">
              {title}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-none truncate hidden sm:block">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: user dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/60 hover:bg-accent/80 transition-all duration-150 active:scale-[0.97] outline-none">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <User className="w-3 h-3 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground max-w-[140px] truncate hidden sm:inline">
                  {profile?.full_name || user?.email}
                </span>
                <span className="text-[11px] text-muted-foreground hidden md:inline">
                  {new Date().toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 mt-1">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal truncate px-3 py-2">
                {user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="gap-2.5 cursor-pointer text-[13px]"
                onClick={() => navigate("/personal_settings")}
              >
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                Personal Settings
              </DropdownMenuItem>

              <DropdownMenuItem
                className="gap-2.5 cursor-pointer text-[13px]"
                onClick={() => navigate("/security_settings")}
              >
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                Security Settings
              </DropdownMenuItem>

              <DropdownMenuItem
                className="gap-2.5 cursor-pointer text-[13px]"
                onClick={() => navigate("/general_settings")}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                General Settings
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="gap-2.5 cursor-pointer text-[13px]"
                onClick={toggleTheme}
              >
                {isDark ? (
                  <Sun className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                {isDark ? "Switch to Light" : "Switch to Dark"}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="gap-2.5 cursor-pointer text-[13px] text-destructive focus:text-destructive"
                onClick={signOut}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Nav bar ── */}
      <nav className="border-t border-border/60 bg-muted/20">
        <div className="container flex items-center gap-0.5 py-1.5 overflow-x-auto scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeId;

            if (item.isDropdown) {
              return (
                <DropdownMenu key={item.id}>
                  <DropdownMenuTrigger asChild>
                    <button className={`${navBase} ${isActive ? navActive : navIdle} gap-1.5`}>
                      <item.icon className="w-3.5 h-3.5 shrink-0" />
                      {item.label}
                      <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>

                  {item.id === "hr" ? (
                    <DropdownMenuContent align="start" className="w-52 mt-1">
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer text-[13px]"
                        onClick={() => navigate("/hr_management")}
                      >
                        <UserCog className="w-3.5 h-3.5 text-muted-foreground" />
                        HR Management
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer text-[13px]"
                        onClick={() => navigate("/payroll_management")}
                      >
                        <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                        Payroll Management
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer text-[13px]"
                        onClick={() => navigate("/face_recognition")}
                      >
                        <ScanFace className="w-3.5 h-3.5 text-muted-foreground" />
                        Face Recognition
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer text-[13px]"
                        onClick={() => navigate("/attendance_management")}
                      >
                        <CalendarCheck className="w-3.5 h-3.5 text-muted-foreground" />
                        Attendance Management
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  ) : item.id === "accounting" ? (
                    <DropdownMenuContent align="start" className="w-56 mt-1">
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer text-[13px]"
                        onClick={() => navigate("/sales_register")}
                      >
                        <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
                        Sales Register
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer text-[13px]"
                        onClick={() => navigate("/expenses_register")}
                      >
                        <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                        Expenses Register
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer text-[13px]"
                        onClick={() => navigate("/accounts_payable")}
                      >
                        <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                        Accounts Payable
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer text-[13px]"
                        onClick={() => navigate("/cash_flow")}
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                        Cash Flow Management
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer text-[13px]"
                        onClick={() => navigate("/tax_management")}
                      >
                        <BadgePercent className="w-3.5 h-3.5 text-muted-foreground" />
                        Tax Management
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  ) : (
                    <DropdownMenuContent align="start" className="w-52 mt-1">
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer text-[13px]"
                        onClick={() => navigate("/services")}
                      >
                        <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
                        Services
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer text-[13px]"
                        onClick={() => navigate("/shop_management")}
                      >
                        <Store className="w-3.5 h-3.5 text-muted-foreground" />
                        Shop Management
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer text-[13px]"
                        onClick={() => navigate("/kiosk_settings")}
                      >
                        <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                        Kiosk Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer text-[13px]"
                        onClick={() => navigate("/user_permissions")}
                      >
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        Users & Permissions
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2.5 cursor-pointer text-[13px]"
                        onClick={() => navigate("/expense_categories")}
                      >
                        <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                        Expense Categories
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  )}
                </DropdownMenu>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => item.path && navigate(item.path)}
                disabled={!item.path && !isActive}
                className={`${navBase} ${isActive ? navActive : navIdle} ${
                  !item.path && !isActive ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};

export default AppHeader;
