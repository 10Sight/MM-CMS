// components/Loader.jsx
import React from "react";
import { motion } from "framer-motion";
import Logo from "/motherson+marelli.png"; // replace with your logo path

export default function Loader() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
      {/* Logo */}
      <img src={Logo} alt="Logo" className="w-44 h-24 mb-6" />

      {/* Animated Loading Text */}
      <motion.p
        className="text-gray-700 text-lg font-semibold"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ repeat: Infinity, duration: 1.2 }}
      >
        Loading...
      </motion.p>
    </div>
  );
}
