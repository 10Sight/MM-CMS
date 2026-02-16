import React, { memo } from "react";
import { motion } from "framer-motion";

const OptimizedLoader = memo(() => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
      {/* Simple spinner instead of loading logo */}
      <div className="flex items-center justify-center mb-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>

      {/* Animated Loading Text - more efficient animation */}
      <motion.p
        className="text-muted-foreground text-base font-medium"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ 
          repeat: Infinity, 
          duration: 1.5,
          ease: "easeInOut"
        }}
      >
        Loading...
      </motion.p>
    </div>
  );
});

OptimizedLoader.displayName = "OptimizedLoader";

export default OptimizedLoader;
