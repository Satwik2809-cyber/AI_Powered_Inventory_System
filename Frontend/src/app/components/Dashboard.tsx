import { useState } from "react";
import useAlerts from "./useAlerts";

import Sidebar from "./Sidebar";
import MainVault from "./MainVault";
import EventVault from "./EventVault";
import UserVault from "./UserVault";
import BrainVault from "./BrainVault";
import Reports from "./Reports";
import DashboardHome from "./DashboardHome";
import AIAssistant from "./AIAssistant";
import Settings from "./Settings";

import { User } from "./type";

export type DashboardView =
  | "home"
  | "main-vault"
  | "event-vault"
  | "user-vault"
  | "brain-vault"
  | "reports"
  | "settings";

interface DashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export default function Dashboard({ currentUser, onLogout }: DashboardProps) {
  const [currentView, setCurrentView] = useState<DashboardView>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  console.log("🔥 Dashboard rendered", currentUser);
  const isAdmin = currentUser.role === "Admin";

  useAlerts(); // 🔔 Smart Alerts hook

  const renderView = () => {
    switch (currentView) {
      case "home":
        console.log("🔥 currentView:", currentView);
        return (
          <DashboardHome
            currentUser={currentUser}
            setCurrentView={setCurrentView}
            isAdmin={isAdmin}
          />
        );
      case "main-vault":
        return (
          <MainVault
            currentUser={currentUser}
            setCurrentView={setCurrentView}
            isAdmin={isAdmin}
          />
        );
      case "event-vault":
        return <EventVault isAdmin={isAdmin} />;
      case "user-vault":
        return <UserVault currentUser={currentUser} />;
      case "brain-vault":
        return <BrainVault />;
      case "reports":
        return <Reports />; // visible to all
      case "settings":
        return <Settings currentUser={currentUser} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={currentUser}
        onLogout={onLogout}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        isAdmin={isAdmin}
      />

      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">{renderView()}</div>
      </main>

      <AIAssistant />
    </div>
  );
}
