import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import "./styles/tailwind.css";

console.log("🔥 main.tsx loaded");

const root = document.getElementById("root");

if (!root) {
  console.error("❌ Root element not found");
} else {
  console.log("✅ Root found");
  createRoot(root).render(<App />);
}
