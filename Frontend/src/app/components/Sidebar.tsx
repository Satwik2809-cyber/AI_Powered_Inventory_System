import { User } from "./type";
import { DashboardView } from "./Dashboard";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

import {
  LayoutDashboard,
  Box,
  Calendar,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

/* ================= TYPES ================= */

interface SidebarProps {
  currentView: DashboardView;
  setCurrentView: (view: DashboardView, tab?: string) => void;
  user: User;
  onLogout: () => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isAdmin: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

interface NavItem {
  id: DashboardView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

/* ================= NAV ITEMS ================= */

const navItems: NavItem[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "main-vault", label: "Main Vault", icon: Box },
  { id: "event-vault", label: "Event Vault", icon: Calendar },
  { id: "user-vault", label: "User Vault", icon: ShoppingCart },
  { id: "brain-vault", label: "Brain Vault", icon: Users },

  // Admin Only
  {
    id: "reports",
    label: "Monthly Analytics",
    icon: BarChart3,
  },
  { id: "settings", label: "Settings", icon: Settings },
];

/* ================= COMPONENT ================= */

export default function Sidebar({
  currentView,
  setCurrentView,
  user,
  onLogout,
  collapsed,
  setCollapsed,
  isAdmin,
  isMobile,
  onClose,
}: SidebarProps) {

  // Safe display name logic
  const displayName = user.name || user.username || "User";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <aside
      className={cn(
        "relative flex flex-col transition-all duration-300 bg-slate-900 border-r border-white/10 z-20",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Background glass effect element */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 via-purple-900/10 to-slate-900/80 pointer-events-none" />

      {/* ================= HEADER ================= */}
      <div className="relative p-6 border-b border-white/10 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-400" />
            <div>
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white tracking-tight">
                Sanjeevika
              </h1>
              <p className="text-[10px] uppercase tracking-wider text-indigo-300/70 font-semibold">
                {user.role} Portal
              </p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={isMobile ? onClose : () => setCollapsed(!collapsed)}
          className={cn(
            "text-slate-400 hover:text-white hover:bg-white/10 transition-colors",
            collapsed && "mx-auto"
          )}
        >
          {isMobile ? (
            <ChevronLeft className="h-4 w-4" />
          ) : collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* ================= USER INFO ================= */}
      {!collapsed && (
        <div className="relative p-5 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-[2px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <span className="text-lg text-transparent bg-clip-text bg-gradient-to-br from-indigo-200 to-purple-200 font-bold">
                  {initials}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate drop-shadow-sm">
                {displayName}
              </p>
              <p className="text-[11px] text-indigo-200/70 truncate uppercase tracking-widest font-medium mt-0.5">
                {(user.assigned_areas && user.assigned_areas.length > 0) ? user.assigned_areas.join(", ") : "Std. Access"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= NAVIGATION ================= */}
      <nav className="relative flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start h-12 transition-all duration-300 relative group overflow-hidden",
                  collapsed ? "px-0 justify-center" : "px-4",
                  isActive
                    ? "bg-indigo-600/20 text-indigo-200 border border-indigo-500/30"
                    : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                )}
                onClick={() => setCurrentView(item.id)}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-transparent pointer-events-none" />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 relative z-10 transition-colors duration-300",
                    !collapsed && "mr-3",
                    isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-indigo-300"
                  )}
                />
                {!collapsed && (
                  <span className="relative z-10 font-medium tracking-wide">
                    {item.label}
                  </span>
                )}
              </Button>
            );
          })}
      </nav>

      {/* ================= LOGOUT ================= */}
      <div className="relative p-4 border-t border-white/10">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start h-12 transition-all duration-300 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20",
            collapsed ? "px-0 justify-center" : "px-4"
          )}
          onClick={onLogout}
        >
          <LogOut className={cn("h-5 w-5", !collapsed && "mr-3")} />
          {!collapsed && <span className="font-medium tracking-wide">Secure Logout</span>}
        </Button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </aside>
  );
}
