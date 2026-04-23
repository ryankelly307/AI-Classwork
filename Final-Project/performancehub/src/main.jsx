import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import PerformanceManager from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PerformanceManager />
  </StrictMode>
);
