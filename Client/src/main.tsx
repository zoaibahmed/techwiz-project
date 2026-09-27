import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./theme.css";
import "./styles.css";
import "./living-market.css";
import "./arrival.css";
import "./experience.css";
import "./location-modal.css";
import "./farmer-workbench.css";
import "./public-experience.css";
import "./components/analytics/analytics.css";
import "./chat.css";
import "./components/shared.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import "./global-market.css";

import "./public-scenes.css";
import "./theme-contract.css";
import "./clarity.css";
