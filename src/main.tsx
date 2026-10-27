import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { MusicProgramProvider } from "./features/program/MusicProgramProvider";
import { RequestsProvider } from "./store/RequestsProvider";
import { AuthProvider } from "./store/AuthProvider";
import { Toaster } from "./components/ui/Toaster";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <RequestsProvider>
        <AuthProvider>
          <MusicProgramProvider>
            <App />
          </MusicProgramProvider>
          <Toaster />
        </AuthProvider>
      </RequestsProvider>
    </BrowserRouter>
  </StrictMode>,
);
