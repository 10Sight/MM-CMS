import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLogoutMutation } from "@/store/api";
import {
  ShieldCheck,
  Users,
  LayoutDashboard,
  Settings,
  Menu,
  LogOut,
  User as UserIcon,
  UsbIcon,
  Download,
} from "lucide-react";
import { useInstallPrompt } from "@/context/InstallContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export default function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { isInstallable, showInstallPrompt } = useInstallPrompt();
  const [logout] = useLogoutMutation();

  const navLinks = [
    { to: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/superadmin/users", label: "Users", icon: Users },
    { to: "/superadmin/units", label: "Units", icon: UsbIcon },
    { to: "/admin/dashboard", label: "Admin", icon: ShieldCheck },
    { to: "/employee/dashboard", label: "Auditor", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      setUser(null);
      navigate("/login", { replace: true });
    } catch (e) { }
  };

  const getInitials = (name) => (name ? name.split(" ").map((n) => n[0]).join("").toUpperCase() : "SA");

  const Sidebar = ({ isMobile = false, onLinkClick = () => { } }) => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">SuperAdmin</span>
        </div>
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => isMobile && onLinkClick()}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                }`}
            >
              <Icon className="h-4 w-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden lg:block border-r bg-background w-64">
        <Sidebar />
      </aside>
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <SheetHeader className="p-0 border-none">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Main navigation menu for the application</SheetDescription>
              </SheetHeader>
              <Sidebar isMobile onLinkClick={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="ml-auto flex items-center gap-2">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user?.fullName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">{user?.fullName || "Super Admin"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-muted/10">
          <div className="mx-auto max-w-7xl w-full p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
