import { useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import { Toaster } from "./components/ui/sonner";
import { apiPost } from "./api";

/* =====================
   TYPES
===================== */

export type UserRole = "Admin" | "Sevadar";

export interface User {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  assignedAreas: string[];
}

export interface AppState {
  currentUser: User | null;
}

/* =====================
   APP
===================== */

export default function App() {
  console.log("🔥 App rendered");

  const [appState, setAppState] = useState<AppState>({
    currentUser: null,
  });

  /* ---------- LOGIN ---------- */
  const handleLogin = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      const user = await apiPost("/auth/login", { username, password });
      console.log("✅ Login success:", user);

      if (user.access_token) {
        window.localStorage.setItem("token", user.access_token);
      }

      setAppState({ currentUser: user });
      return true;
    } catch (err) {
      console.error("❌ Login failed", err);
      return false;
    }
  };

  /* ---------- LOGOUT ---------- */
  const handleLogout = () => {
    setAppState({ currentUser: null });
  };

  /* ---------- RENDER ---------- */
  if (!appState.currentUser) {
    console.log("🟡 Showing Login screen");
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  console.log("🟢 Showing Dashboard");

  return (
    <>
      <Dashboard
        currentUser={appState.currentUser}
        onLogout={handleLogout}
      />
      <Toaster />
    </>
  );
}
