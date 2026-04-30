import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider as JotaiProvider } from "jotai";
import "./index.css";
import "./container";
import "./i18n";
import App from "./App";
import { configureAmplify } from "./lib/amplify-config";

configureAmplify();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <JotaiProvider>
      <App />
    </JotaiProvider>
  </StrictMode>,
);
