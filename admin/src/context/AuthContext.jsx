import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useGetMeQuery } from "@/store/api";

// Create the context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeUnitId, setActiveUnitId] = useState(null);
  const [activeDepartmentId, setActiveDepartmentId] = useState(null);

  const { data: meData, isLoading: meLoading, refetch } = useGetMeQuery();

  // Memoized fetch user function
  const fetchUser = useCallback(async () => {
    setError(null);
    try {
      const res = await refetch();
      const userData = res.data?.data?.employee || null;
      setUser(userData);
    } catch (err) {
      setUser(null);
      setError(err?.error || 'Failed to authenticate');
    }
  }, [refetch]);

  // Memoized logout function
  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    setActiveUnitId(null);
    setActiveDepartmentId(null);
  }, []);

  // Sync local state with RTK Query data
  useEffect(() => {
    setLoading(meLoading);
    const userData = meData?.data?.employee || null;
    if (userData !== undefined) {
      setUser(userData);
    }
  }, [meData, meLoading]);

  // Reset active unit when user is cleared (e.g. logout)
  useEffect(() => {
    if (!user) {
      setActiveUnitId(null);
      setActiveDepartmentId(null);
    }
  }, [user]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    setUser,
    loading,
    error,
    fetchUser,
    logout,
    activeUnitId,
    setActiveUnitId,
    activeDepartmentId,
    setActiveDepartmentId,
  }), [user, loading, error, fetchUser, logout, activeUnitId, activeDepartmentId]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use context easily
export const useAuth = () => useContext(AuthContext);

export const getRoleBasedRedirect = (role) => {
  if (role === "superadmin") return "/superadmin/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/employee/dashboard";
};
