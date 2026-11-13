import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/App";
import { system } from "@/theme";
import { Provider } from "@my-app/ui/provider";
import { Toaster } from "@my-app/ui/toaster";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root");

createRoot(root).render(
  <StrictMode>
    <Provider system={system}>
      <App />
      <Toaster />
    </Provider>
  </StrictMode>,
);
