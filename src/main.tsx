import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isDevIpLoopback =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  window.location.hostname === "127.0.0.1";

if (isDevIpLoopback) {
  const redirectUrl = new URL(window.location.href);
  redirectUrl.hostname = "localhost";
  window.location.replace(redirectUrl.toString());
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
