import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  Menu,
  Bell,
  User,
  Briefcase,
  Activity,
  CircleUserIcon,
  Download
} from "lucide-react";
import { useLogoutMutation, useGetUnitsQuery, useGetDepartmentsQuery } from "@/store/api";
import { useInstallPrompt } from "@/context/InstallContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { motion } from "framer-motion";

export default function EmployeeLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { user, setUser, activeUnitId, setActiveUnitId, activeDepartmentId, setActiveDepartmentId } = useAuth();
  const [logout] = useLogoutMutation();
  const { isInstallable, showInstallPrompt } = useInstallPrompt();

  // Superadmin: Fetch Units for selection
  const { data: unitsRes } = useGetUnitsQuery(undefined, { skip: user?.role !== "superadmin" });
  const units = unitsRes?.data || [];

  // Superadmin: Fetch Departments for selection (filtered by activeUnitId)
  const { data: deptsRes } = useGetDepartmentsQuery(
    { unit: activeUnitId, limit: 100 },
    { skip: user?.role !== "superadmin" || !activeUnitId }
  );
  const departments = deptsRes?.data?.departments || [];

  const navLinks = [
    { to: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/employee/inspections", label: "Inspections", icon: FileText },
    { to: "/employee/settings", label: "Profile", icon: CircleUserIcon },
  ];

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      setUser(null);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleProfile = () => {
    navigate("/employee/settings");
  };

  const getInitials = (name) => {
    if (!name) return "EM";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getDepartmentName = (dept) => {
    if (!dept) return "Department";
    if (Array.isArray(dept)) {
      if (dept.length === 0) return "Department";
      return dept.map(d => d.name || "Dept").join(", ");
    }
    if (typeof dept === "string") return dept;
    if (typeof dept === "object" && dept?.name) return dept.name;
    return "Department";
  };

  const CollapsedSidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b">
        <Briefcase className="h-6 w-6 text-primary" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-2 overflow-y-auto">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center justify-center w-full h-10 rounded-lg transition-all hover:bg-accent ${isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-accent-foreground"
                }`}
              title={link.label}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-10 p-0 text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const SidebarContent = ({ className = "", isMobile = false, onLinkClick = () => { } }) => (
    <div className={`flex h-full flex-col ${className}`}>
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <Briefcase className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">Auditor Panel</span>
        </div>
      </div>

      {/* User Info Card */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(user?.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">
              {user?.fullName || "Auditor"}
            </span>
            <Badge variant="secondary" className="w-fit text-xs truncate">
              {getDepartmentName(user?.department)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;

          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => isMobile && onLinkClick()}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground ${isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground"
                }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ width: sidebarOpen ? 280 : 64 }}
        animate={{ width: sidebarOpen ? 280 : 64 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden border-r bg-background md:block shrink-0"
      >
        {sidebarOpen ? <SidebarContent /> : <CollapsedSidebarContent />}
      </motion.aside>

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <SheetHeader className="p-0 border-none">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Main navigation menu for the application</SheetDescription>
              </SheetHeader>
              <SidebarContent className="w-full" isMobile={true} onLinkClick={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Desktop Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Back to SuperAdmin (visible only for superadmin users) */}
          {user?.role === "superadmin" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/superadmin/dashboard")}
              >
                Back to Dashboard
              </Button>

              {/* Superadmin Unit Selector */}
              <Select
                value={activeUnitId || "all"}
                onValueChange={(val) => {
                  const newVal = val === "all" ? null : val;
                  setActiveUnitId(newVal);
                  setActiveDepartmentId(null); // Reset dept when unit changes
                }}
              >
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Superadmin Department Selector */}
              <Select
                value={activeDepartmentId || "all"}
                onValueChange={(val) => setActiveDepartmentId(val === "all" ? null : val)}
                disabled={!activeUnitId}
              >
                <SelectTrigger className="w-[160px] h-8">
                  <SelectValue placeholder="Select Dept" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Select Dept</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Header Actions */}
          <div className="ml-auto flex items-center gap-3 md:gap-4">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <Badge className="absolute -top-1 -right-1 h-2 w-2 p-0 bg-destructive" />
            </Button>

            {/* Install PWA Button */}
            {isInstallable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={showInstallPrompt}
                title="Install App"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}

            {/* Activity Status */}
            <div className="hidden sm:flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>

            {/* Brand */}
            <div className="hidden xs:flex items-center gap-2">
              <img
                src="/motherson+marelli.png"
                alt="Motherson"
                className="h-6 w-6 md:h-8 md:w-8 object-contain"
              />
              {/* <span className="hidden sm:block font-semibold text-lg">
                Motherson
              </span> */}
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 md:h-10 md:w-10 rounded-full">
                  <Avatar className="h-8 w-8 md:h-10 md:w-10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user?.fullName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.fullName || "Auditor"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.employeeId || "Auditor ID"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfile}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 bg-muted/10 overflow-y-visible">
          <div className="mx-auto max-w-7xl w-full p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
