import React, { memo } from "react";
import OptimizedLoader from "@/components/ui/OptimizedLoader";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";

const ProtectedRoute = memo(({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <OptimizedLoader />;
  if (!user) return <Navigate to="/login" replace />;
  
  // Superadmin can access everything. 
  // Users with isAdminPower = true get access to any route that allows 'admin' roles.
  const hasAccess = user.role === "superadmin" || 
                    allowedRoles.includes(user.role) || 
                    (user.isAdminPower && allowedRoles.includes("admin"));

  if (!hasAccess)
    return <Navigate to="/login" replace />;

  return children;
});

ProtectedRoute.displayName = "ProtectedRoute";

export default ProtectedRoute;
