import { useState, useEffect } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import { Toaster } from "./components/ui/sonner";

export interface User {
  id: string;
  username: string;
  name: string;
  role: "Admin" | "Sevadar";
  assignedAreas: string[];
}

export interface InventoryItem {
  id: string;
  name: string;
  image?: string;
  area: string;
  quantity: number;
  rate: number;
  createdBy: string;
  lastRestockedBy?: string;
  createdAt: string;
  lastRestockedAt?: string;
}

export interface SaleRecord {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  rate: number;
  area: string;
  soldBy: string;
  soldTo?: string;
  timestamp: string;
  eventId?: string;
  eventDay?: number;
}

export interface Event {
  id: string;
  name: string;
  type: string;
  mode: "single-day" | "multi-day";
  days?: number;
  startDate: string;
  endDate?: string;
  status: "Planned" | "Active" | "Paused" | "Completed";
  createdBy: string;
  createdAt: string;
  items: EventItem[];
  currentDay?: number;
}

export interface EventItem {
  itemId: string;
  itemName: string;
  area: string;
  rate: number;
  initialQuantity: number;
  addedBy: string;
  addedAt: string;
  dailyTracking?: DayTracking[];
}

export interface DayTracking {
  day: number;
  date: string;
  startQuantity: number;
  sold: number;
  endQuantity: number;
  sales: SaleRecord[];
}

export interface AppState {
  users: User[];
  inventory: InventoryItem[];
  events: Event[];
  sales: SaleRecord[];
  currentUser: User | null;
}

function App() {
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem("sanjeevika-state");
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      users: [
        {
          id: "admin1",
          username: "admin",
          name: "Admin User",
          role: "Admin",
          assignedAreas: ["All"],
        },
        {
          id: "user1",
          username: "sevadar1",
          name: "Sevadar One",
          role: "Sevadar",
          assignedAreas: ["Homecare"],
        },
        {
          id: "user2",
          username: "sevadar2",
          name: "Sevadar Two",
          role: "Sevadar",
          assignedAreas: ["Food"],
        },
      ],
      inventory: [
        {
          id: "item1",
          name: "Detergent Powder",
          area: "Homecare",
          quantity: 150,
          rate: 120,
          createdBy: "Admin User",
          createdAt: new Date().toISOString(),
        },
        {
          id: "item2",
          name: "Rice (1kg)",
          area: "Food",
          quantity: 200,
          rate: 60,
          createdBy: "Admin User",
          createdAt: new Date().toISOString(),
        },
        {
          id: "item3",
          name: "Plates Set",
          area: "Utilities",
          quantity: 80,
          rate: 50,
          createdBy: "Admin User",
          createdAt: new Date().toISOString(),
        },
      ],
      events: [],
      sales: [],
      currentUser: null,
    };
  });

  useEffect(() => {
    localStorage.setItem("sanjeevika-state", JSON.stringify(appState));
  }, [appState]);

  const handleLogin = (username: string, password: string) => {
    const user = appState.users.find(
      (u) => u.username === username && password === "password"
    );
    if (user) {
      setAppState({ ...appState, currentUser: user });
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setAppState({ ...appState, currentUser: null });
  };

  if (!appState.currentUser) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <Dashboard
        appState={appState}
        setAppState={setAppState}
        onLogout={handleLogout}
      />
      <Toaster />
    </>
  );
}

export default App;
