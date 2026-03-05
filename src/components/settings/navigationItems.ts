import {
  LayoutDashboard,
  Store,
  UserCog,
  Wallet,
  ScanFace,
  CalendarCheck,
  ShoppingCart,
  Receipt,
  CreditCard,
  TrendingUp,
  BadgePercent,
  BarChart2,
  Wrench,
  Monitor,
  Users,
  Tag,
} from "lucide-react";

export interface NavigationItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  nav_item_id: string;
  children?: NavigationItem[];
}

export const navigationItems: NavigationItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview of salon performance",
    nav_item_id: "dashboard",
  },
  {
    title: "Branches",
    url: "/branch_management",
    icon: Store,
    description: "Manage salon branches",
    nav_item_id: "branches",
  },
  {
    title: "HR Management",
    icon: UserCog,
    description: "Human resources and staff management",
    nav_item_id: "hr",
    children: [
      {
        title: "HR Management",
        url: "/hr_management",
        icon: UserCog,
        description: "Staff records and management",
        nav_item_id: "hr_management",
      },
      {
        title: "Payroll Management",
        url: "/payroll_management",
        icon: Wallet,
        description: "Process and manage payroll",
        nav_item_id: "payroll_management",
      },
      {
        title: "Face Recognition",
        url: "/face_recognition",
        icon: ScanFace,
        description: "Face recognition attendance",
        nav_item_id: "face_recognition",
      },
      {
        title: "Attendance Management",
        url: "/attendance_management",
        icon: CalendarCheck,
        description: "Track staff attendance",
        nav_item_id: "attendance_management",
      },
    ],
  },
  {
    title: "Accounting",
    icon: Receipt,
    description: "Financial records and accounting",
    nav_item_id: "accounting",
    children: [
      {
        title: "Sales Register",
        url: "/sales_register",
        icon: ShoppingCart,
        description: "Record and view sales",
        nav_item_id: "sales_register",
      },
      {
        title: "Expenses Register",
        url: "/expenses_register",
        icon: Receipt,
        description: "Record and manage expenses",
        nav_item_id: "expenses_register",
      },
      {
        title: "Accounts Payable",
        url: "/accounts_payable",
        icon: CreditCard,
        description: "Manage accounts payable",
        nav_item_id: "accounts_payable",
      },
      {
        title: "Cash Flow Management",
        url: "/cash_flow",
        icon: TrendingUp,
        description: "Track cash flow",
        nav_item_id: "cash_flow",
      },
      {
        title: "Tax Management",
        url: "/tax_management",
        icon: BadgePercent,
        description: "Manage taxes",
        nav_item_id: "tax_management",
      },
    ],
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart2,
    description: "Analytics and reporting",
    nav_item_id: "reports",
  },
  {
    title: "Settings",
    icon: Wrench,
    description: "System configuration",
    nav_item_id: "settings",
    children: [
      {
        title: "Services",
        url: "/services",
        icon: Wrench,
        description: "Manage salon services",
        nav_item_id: "services",
      },
      {
        title: "Shop Management",
        url: "/shop_management",
        icon: Store,
        description: "Configure shop settings",
        nav_item_id: "shop_management",
      },
      {
        title: "Kiosk Settings",
        url: "/kiosk_settings",
        icon: Monitor,
        description: "Configure kiosk display",
        nav_item_id: "kiosk_settings",
      },
      {
        title: "Users & Permissions",
        url: "/user_permissions",
        icon: Users,
        description: "Manage users and access",
        nav_item_id: "user_permissions",
      },
      {
        title: "Expense Categories",
        url: "/expense_categories",
        icon: Tag,
        description: "Manage expense categories",
        nav_item_id: "expense_categories",
      },
    ],
  },
];
