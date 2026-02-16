import React, { useState, useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { Toaster } from "@/components/ui/sonner";

import { InstallPromptProvider } from "@/context/InstallContext";

function App() {

  return (
    <InstallPromptProvider>
      <Router>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </Router>
    </InstallPromptProvider>
  );
}

export default App;
