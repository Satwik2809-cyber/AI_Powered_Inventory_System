import { User } from "../App";
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
  ChevronRight 
} from "lucide-react";

interface SidebarProps {
  currentView: DashboardView;
  setCurrentView: (view: DashboardView) => void;
  user: User;
  onLogout: () => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

interface NavItem {
  id: DashboardView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "main-vault", label: "Main Vault", icon: Box },
  { id: "event-vault", label: "Event Vault", icon: Calendar },
  { id: "user-vault", label: "User Vault", icon: ShoppingCart },
  { id: "brain-vault", label: "Brain Vault", icon: Users },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar({
  currentView,
  setCurrentView,
  user,
  onLogout,
  collapsed,
  setCollapsed,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-indigo-600">Sanjeevika</h1>
              <p className="text-xs text-gray-500 mt-1">{user.role}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(collapsed && "mx-auto")}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {user.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.assignedAreas.join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start",
                collapsed ? "px-2" : "px-4",
                isActive && "bg-indigo-600 text-white hover:bg-indigo-700"
              )}
              onClick={() => setCurrentView(item.id)}
            >
              <Icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
              {!collapsed && <span>{item.label}</span>}
            </Button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50",
            collapsed ? "px-2" : "px-4"
          )}
          onClick={onLogout}
        >
          <LogOut className={cn("h-5 w-5", !collapsed && "mr-3")} />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
}