import React from "react";
import { createRoot } from "react-dom/client";
import "@gummy-ui/ui/styles.css";
import "./index.css";
import { App } from "./App";
createRoot(document.getElementById("root")!).render(<App />);
