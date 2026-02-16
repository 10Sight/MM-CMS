import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import OptimizedLoader from "@/components/ui/OptimizedLoader";

// Layouts
const AdminLayout = lazy(() => import("../Layout/AdminLayout"));
const EmployeeLayout = lazy(() => import("../Layout/EmployeeLayout"));
const SuperAdminLayout = lazy(() => import("../Layout/SuperAdminLayout"));

// Pages
const LoginPage = lazy(() => import("../pages/LoginPage"));
const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));
const EmployeesPage = lazy(() => import("../pages/EmployeesPage"));
const AddEmployeePage = lazy(() => import("../pages/AddEmployee"));
const EmployeeDetailPage = lazy(() => import("../pages/EmployeeDetailPage"));
const AdminCreateTemplatePage = lazy(() => import("@/pages/AdminCreateTemplatePage"));
const EmployeeFillInspectionPage = lazy(() => import("@/pages/EmployeeFillInspectionPage"));
const AuditsPage = lazy(() => import("@/pages/AuditPage"));
const DepartmentPage = lazy(() => import("@/pages/DepartmentPage"));
const DepartmentDetailPage = lazy(() => import("@/pages/DepartmentDetailPage"));
const DepartmentLineMachinesPage = lazy(() => import("@/pages/DepartmentLineMachinesPage"));
const AuditDetailPage = lazy(() => import("@/pages/AuditDetailPage"));
const AdminManageQuestionsPage = lazy(() => import("@/pages/AdminManageQuestionsPage"));
const AdminTemplateQuestionsPage = lazy(() => import("@/pages/AdminTemplateQuestionsPage"));
const EmployeeDashboard = lazy(() => import("@/pages/EmployeeDashboard"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminEditAuditPage = lazy(() => import("@/pages/AdminAuditPage"));
const EditEmployeePage = lazy(() => import("@/pages/EditEmployeePage"));
const EmployeeAuditResult = lazy(() => import("@/pages/EmployeeAuditResult"));
const LinesPage = lazy(() => import("@/pages/LinesPage"));
const MachinesPage = lazy(() => import("@/pages/MachinesPage"));
const ProcessesPage = lazy(() => import("@/pages/ProcessesPage"));
const UnitsPage = lazy(() => import("@/pages/UnitsPage"));
const SuperAdminDashboard = lazy(() => import("@/pages/SuperAdminDashboard"));
const SuperAdminUsersPage = lazy(() => import("@/pages/SuperAdminUsersPage"));
const SuperAdminEmployeeDetailPage = lazy(() => import("@/pages/SuperAdminEmployeeDetailPage"));
const SuperAdminAdminDetailPage = lazy(() => import("@/pages/SuperAdminAdminDetailPage"));
const AuditEmailSettingsPage = lazy(() => import("@/pages/AuditEmailSettingsPage"));
const AuditFormSettingsPage = lazy(() => import("@/pages/AuditFormSettingsPage"));
const AdminQuestionCategoriesPage = lazy(() => import("@/pages/AdminQuestionCategoriesPage"));
const AdminQuestionCategoryDetailPage = lazy(() => import("@/pages/AdminQuestionCategoryDetailPage"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<OptimizedLoader />}>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* SuperAdmin Routes */}
        <Route
          path="/superadmin/*"
          element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <SuperAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SuperAdminDashboard />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="users" element={<SuperAdminUsersPage />} />
          <Route path="users/employee/:id" element={<SuperAdminEmployeeDetailPage />} />
          <Route path="users/admin/:id" element={<SuperAdminAdminDetailPage />} />
          <Route path="audits/:id" element={<AuditDetailPage />} />
          <Route path="units" element={<UnitsPage />} />
          <Route path="add-user" element={<AddEmployeePage />} />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="add-employee" element={<AddEmployeePage />} />
          <Route path="employee/:id" element={<EmployeeDetailPage />} />
          <Route path="audits" element={<AuditsPage />} />
          <Route path="questions" element={<AdminManageQuestionsPage />} />
          <Route path="questions/template/:title" element={<AdminTemplateQuestionsPage />} />
          <Route path="question-categories" element={<AdminQuestionCategoriesPage />} />
          <Route path="question-categories/:id" element={<AdminQuestionCategoryDetailPage />} />
          <Route path="audits/:id" element={<AuditDetailPage />} />
          <Route path="audits/create" element={<AdminCreateTemplatePage />} />
          <Route path="departments" element={<DepartmentPage />} />
          <Route path="departments/:id" element={<DepartmentDetailPage />} />
          <Route path="departments/:id/lines/:lineId" element={<DepartmentLineMachinesPage />} />
          <Route path="lines" element={<LinesPage />} />
          <Route path="machines" element={<MachinesPage />} />
          <Route path="processes" element={<ProcessesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="email-settings" element={<AuditEmailSettingsPage />} />
          <Route path="form-settings" element={<AuditFormSettingsPage />} />
          <Route path="audits/edit/:id" element={<AdminEditAuditPage />} />
          <Route path="employee/edit/:id" element={<EditEmployeePage />} />
        </Route>

        {/* Employee Routes */}
        <Route
          path="/employee/*"
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <EmployeeLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<EmployeeFillInspectionPage />} />
          <Route path="inspections" element={<EmployeeFillInspectionPage />} />
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="results/:auditId" element={<EmployeeAuditResult />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
