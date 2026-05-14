import { useState, useEffect } from "react";
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
import { Menu, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

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
  const [viewHistory, setViewHistory] = useState<DashboardView[]>([]);
  const [vaultTab, setVaultTab] = useState<string>("products");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Function to change view and update history
  const navigateTo = (view: DashboardView, tab: string = "products") => {
    if (view !== currentView || tab !== vaultTab) {
      setViewHistory((prev) => [...prev, currentView]);
      setCurrentView(view);
      setVaultTab(tab);
      // Update browser history for native back button support
      window.history.pushState({ view, tab }, "", "");
    }
    setMobileMenuOpen(false); // Close mobile menu on navigate
  };

  // Function to go back
  const handleBack = () => {
    if (viewHistory.length > 0) {
      const prevHistory = [...viewHistory];
      const prevView = prevHistory.pop();
      if (prevView) {
        setViewHistory(prevHistory);
        setCurrentView(prevView);
        setVaultTab("products"); // Reset to default when going back
      }
    }
  };

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setCurrentView(event.state.view);
        setVaultTab(event.state.tab || "products");
        // We don't push to history here, as we're going back/forward
      } else if (currentView !== "home") {
        setCurrentView("home");
        setVaultTab("products");
      }
    };

    window.addEventListener("popstate", handlePopState);
    // Initial state push
    window.history.replaceState({ view: "home", tab: "products" }, "", "");

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
            setCurrentView={navigateTo}
            isAdmin={isAdmin}
          />
        );
      case "main-vault":
        return (
          <MainVault
            currentUser={currentUser}
            setCurrentView={navigateTo}
            isAdmin={isAdmin}
            initialTab={vaultTab}
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
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-full">
        <Sidebar
          currentView={currentView}
          setCurrentView={navigateTo}
          user={currentUser}
          onLogout={onLogout}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          isAdmin={isAdmin}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Content */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:hidden bg-slate-900 shadow-2xl",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar
          currentView={currentView}
          setCurrentView={navigateTo}
          user={currentUser}
          onLogout={onLogout}
          collapsed={false}
          setCollapsed={() => {}}
          isAdmin={isAdmin}
          isMobile={true}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      <main className="flex-1 overflow-auto w-full">
        {/* Responsive Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-600 hover:bg-slate-100"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            
            {viewHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 px-2 h-9"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Back</span>
              </Button>
            )}
            
            <h2 className="text-lg font-bold text-slate-800 capitalize">
              {currentView.replace("-", " ")}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-tighter">{currentUser.role}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              {currentUser.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {renderView()}
        </div>
      </main>


      <AIAssistant />
    </div>
  );
}
