// The app as `src/main.tsx` starts it, with the sample names already typed.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { SAMPLE_TEXT } from "@/__fixtures__/run";
import { App } from "@/App";
import { useInput } from "@/store";
import { system } from "@/theme";
import { Provider } from "@my-app/ui/provider";
import { Toaster } from "@my-app/ui/toaster";

useInput.setState({ text: SAMPLE_TEXT });

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
