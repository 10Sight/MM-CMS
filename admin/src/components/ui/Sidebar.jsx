// components/Sidebar.jsx
import React, { memo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  handleLogout,
  navLinks = [],
  logo = "/logo.svg",
  brand = "App Panel",
}) {
  const location = useLocation();

  // Callbacks (memoized to prevent re-renders)
  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), [setSidebarOpen]);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), [setMobileSidebarOpen]);

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ width: 80 }}
        animate={{ width: sidebarOpen ? 256 : 80 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="hidden md:flex flex-col bg-gray-100 border-r border-gray-200"
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200">
          <AnimatePresence>
            {sidebarOpen && (
              <motion.h1
                key="brand"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-xl font-bold tracking-wide text-black"
              >
                {brand}
              </motion.h1>
            )}
          </AnimatePresence>
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-2 py-6 space-y-2">
          {navLinks.map((link, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === link.to
                    ? "bg-[#099cdb] text-white font-semibold"
                    : "hover:bg-[#099cdb]/10 text-black"
                }`}
              >
                {link.icon}
                {sidebarOpen && <span>{link.label}</span>}
              </Link>
            </motion.div>
          ))}
        </nav>

        {/* Logout */}
        {handleLogout && (
          <div className="px-3 py-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg transition text-black"
            >
              <LogOut size={20} />
              {sidebarOpen && "Logout"}
            </button>
          </div>
        )}
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: mobileSidebarOpen ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="fixed inset-y-0 left-0 z-50 md:hidden flex flex-col bg-gray-100 border-r border-gray-200 w-64"
      >
        {/* Logo Section Mobile */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
            <h1 className="text-lg font-bold tracking-wide text-black">{brand}</h1>
          </div>
          <button
            onClick={closeMobileSidebar}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Nav Links Mobile */}
        <div className="flex-1 px-2 py-4 space-y-2">
          {navLinks.map((link, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link
                to={link.to}
                onClick={closeMobileSidebar}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === link.to
                    ? "bg-[#099cdb] text-white font-semibold"
                    : "hover:bg-[#099cdb]/10 text-black"
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Logout Mobile */}
        {handleLogout && (
          <div className="px-3 py-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg transition text-black"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        )}
      </motion.aside>
    </>
  );
}

export default memo(Sidebar);
