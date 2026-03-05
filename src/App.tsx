import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BranchModalProvider } from "@/features/branch/BranchModalContext";
import { ManageServicesModalProvider } from "@/features/manage-services/ManageServicesModalContext";
import { BranchSettingsModalProvider } from "@/features/branch-settings/BranchSettingsModalContext";
import { AddEmployeeModalProvider } from "@/features/hr/AddEmployeeModalContext";
import { EditEmployeeModalProvider } from "@/features/hr/EditEmployeeModalContext";
import { BranchBarbersModalProvider } from "@/features/branch-barbers/BranchBarbersModalContext";
import { AddSaleModalProvider } from "@/features/sales/AddSaleModalContext";
import { EditSaleModalProvider } from "@/features/sales/EditSaleModalContext";
import { ExpenseModalProvider } from "@/features/expenses/ExpenseModalContext";
import { PayrollModalProvider } from "@/features/payroll/PayrollModalContext";
import { FaceEnrollModalProvider } from "@/features/face-recognition/FaceEnrollModalContext";
import FaceEnrollModal from "@/features/face-recognition/FaceEnrollModal";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import BranchManagement from "./pages/BranchManagement";
import HRManagement from "./pages/HRManagement";
import PayrollManagement from "./pages/PayrollManagement";
import Services from "./pages/Services";
import SalesRegister from "./pages/SalesRegister";
import ExpensesRegister from "./pages/ExpensesRegister";
import Reports from "./pages/Reports";
import FaceRecognition from "./pages/FaceRecognition";
import AttendanceManagement from "./pages/AttendanceManagement";
import ExpenseCategories from "./pages/ExpenseCategories";
import UsersAndPermissions from "./pages/UsersAndPermissions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BranchModalProvider>
          <ManageServicesModalProvider>
          <BranchSettingsModalProvider>
          <AddEmployeeModalProvider>
          <EditEmployeeModalProvider>
          <BranchBarbersModalProvider>
          <AddSaleModalProvider>
          <EditSaleModalProvider>
          <ExpenseModalProvider>
          <PayrollModalProvider>
          <FaceEnrollModalProvider>
          <FaceEnrollModal />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<SuperAdminDashboard />} />
            <Route path="/branch_management" element={<BranchManagement />} />
            <Route path="/hr_management" element={<HRManagement />} />
            <Route path="/payroll_management" element={<PayrollManagement />} />
            <Route path="/services" element={<Services />} />
            <Route path="/sales_register" element={<SalesRegister />} />
            <Route path="/expenses_register" element={<ExpensesRegister />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/face_recognition" element={<FaceRecognition />} />
            <Route path="/attendance_management" element={<AttendanceManagement />} />
            <Route path="/expense_categories" element={<ExpenseCategories />} />
            <Route path="/user_permissions" element={<UsersAndPermissions />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </FaceEnrollModalProvider>
          </PayrollModalProvider>
          </ExpenseModalProvider>
          </EditSaleModalProvider>
          </AddSaleModalProvider>
          </BranchBarbersModalProvider>
          </EditEmployeeModalProvider>
          </AddEmployeeModalProvider>
          </BranchSettingsModalProvider>
          </ManageServicesModalProvider>
          </BranchModalProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
