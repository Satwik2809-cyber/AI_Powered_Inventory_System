import { useState } from "react";
import { AppState } from "../App";
import Sidebar from "./Sidebar";
import MainVault from "./MainVault";
import EventVault from "./EventVault";
import UserVault from "./UserVault";
import BrainVault from "./BrainVault";
import Reports from "./Reports";
import DashboardHome from "./DashboardHome";
import AIAssistant from "./AIAssistant";

interface DashboardProps {
  appState: AppState;
  setAppState: (state: AppState) => void;
  onLogout: () => void;
}

export type DashboardView =
  | "home"
  | "main-vault"
  | "event-vault"
  | "user-vault"
  | "brain-vault"
  | "reports"
  | "settings";

export default function Dashboard({
  appState,
  setAppState,
  onLogout,
}: DashboardProps) {
  const [currentView, setCurrentView] = useState<DashboardView>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case "home":
        return (
          <DashboardHome
            appState={appState}
            setCurrentView={setCurrentView}
          />
        );
      case "main-vault":
        return <MainVault appState={appState} setAppState={setAppState} />;
      case "event-vault":
        return <EventVault appState={appState} setAppState={setAppState} />;
      case "user-vault":
        return <UserVault appState={appState} setAppState={setAppState} />;
      case "brain-vault":
        return <BrainVault appState={appState} setAppState={setAppState} />;
      case "reports":
        return <Reports appState={appState} />;
      case "settings":
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500">Settings panel - Coming soon</p>
          </div>
        );
      default:
        return <DashboardHome appState={appState} setCurrentView={setCurrentView} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={appState.currentUser!}
        onLogout={onLogout}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          {renderView()}
        </div>
      </main>
      <AIAssistant appState={appState} setAppState={setAppState} />
    </div>
  );
}