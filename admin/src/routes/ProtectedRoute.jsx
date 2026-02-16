import React, { memo } from "react";
import OptimizedLoader from "@/components/ui/OptimizedLoader";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";

const ProtectedRoute = memo(({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <OptimizedLoader />;
  if (!user) return <Navigate to="/login" replace />;
  // Superadmin can access everything
  if (user.role !== "superadmin" && !allowedRoles.includes(user.role))
    return <Navigate to="/login" replace />;

  return children;
});

ProtectedRoute.displayName = "ProtectedRoute";

export default ProtectedRoute;
