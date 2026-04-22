import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { toast } from "sonner";
import { User } from "./type";
import { DashboardView } from "./Dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

import {
  ShoppingCart,
  Calendar,
  PlayCircle,
  AlertTriangle,
  TrendingUp,
  Wallet,
  CreditCard,
  Package,
  Clock,
  Sparkles,
  ArrowRight
} from "lucide-react";

interface DashboardHomeProps {
  currentUser: User;
  setCurrentView: (view: DashboardView) => void;
  isAdmin: boolean;
}

export default function DashboardHome({
  currentUser,
  setCurrentView,
  isAdmin
}: DashboardHomeProps) {
  const [dashboard, setDashboard] = useState<any>(null);
  const [eventDash, setEventDash] = useState<any>(null);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Used safe fallback for missing names previously
  const displayName = currentUser?.name || currentUser?.username || "Admin";

  /* ---------------- LOAD DASHBOARD ---------------- */
  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 20000);
    return () => clearInterval(interval);
  }, []);

  async function loadDashboard() {
    try {
      const data = await apiGet(`/user/dashboard?user_id=${currentUser.id}`);
      setDashboard(data);

      if (data?.active_event) {
        setActiveEvent(data.active_event);
        const ev = await apiGet(`/events/${data.active_event.id}/dashboard`);
        setEventDash(ev);
      } else {
        setActiveEvent(null);
        setEventDash(null);
      }
    } catch (err: any) {
      toast.error("Dashboard API failed");
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- LOADING ---------------- */
  if (loading || !dashboard) {
    return (
      <div className="flex items-center justify-center p-20 animate-in fade-in zoom-in duration-500">
        <div className="relative">
          <div className="absolute -inset-4 bg-indigo-500/20 blur-xl rounded-full animate-pulse blur-[50px]"></div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 relative z-10"></div>
        </div>
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">

      {/* HEADER SECTION (GLASSMORPHIC) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/90 via-slate-900/95 to-slate-900/90 p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 tracking-tight flex items-center gap-3 mb-2">
              Welcome back, {displayName}
              <Sparkles className="h-6 w-6 text-indigo-400" />
            </h1>
            <p className="text-indigo-200/80 text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* TODAY SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-3 lg:col-span-2 relative overflow-hidden border border-white/10 bg-slate-900/80 backdrop-blur-md rounded-3xl group shadow-[0_0_40px_rgba(0,0,0,0.3)]">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-1000"></div>
          <CardContent className="relative p-8 h-full flex flex-col justify-center">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="text-emerald-400" /> Revenue Overview
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                <p className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Today's Revenue</p>
                <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                  ₹{dashboard.today_revenue?.toLocaleString() || 0}
                </div>
              </div>
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                <p className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Yesterday</p>
                <div className="text-3xl font-bold text-white">
                  ₹{dashboard.yesterday_revenue?.toLocaleString() || 0}
                </div>
              </div>
              <div className="bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/20">
                <p className="text-indigo-300 text-sm font-medium mb-1 uppercase tracking-wider">This Month</p>
                <div className="text-3xl font-bold text-indigo-400">
                  ₹{dashboard.month_revenue?.toLocaleString() || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* STOCK ALERT MINI CARD */}
        <Card
          className="relative overflow-hidden border border-white/10 bg-slate-900/80 backdrop-blur-md rounded-3xl group cursor-pointer shadow-[0_0_40px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300"
          onClick={() => setCurrentView("main-vault")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent"></div>
          <CardContent className="relative p-8 h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-4 bg-orange-500/20 rounded-2xl text-orange-400">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/30 uppercase tracking-widest px-3 py-1">
                  {dashboard.critical_stock > 0 ? "Critical" : "Status"}
                </Badge>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Low Stock Alerts</h3>
              <div className="text-4xl font-extrabold text-orange-400 mb-2">
                {dashboard.critical_stock || dashboard.low_stock || "0"} <span className="text-lg text-slate-400 font-medium">items</span>
              </div>
            </div>
            <div className="flex items-center text-orange-300 mt-4 font-semibold group-hover:translate-x-2 transition-transform">
              Check Inventory <ArrowRight className="ml-2 w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ACTION PANELS */}
      <h2 className="text-2xl font-bold text-slate-200 pl-2">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* DAILY SELL CARD */}
        <Card
          className="relative overflow-hidden border border-white/10 bg-slate-900/80 backdrop-blur-md rounded-3xl group hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.3)] transition-all duration-500 cursor-pointer"
          onClick={() => setCurrentView("main-vault")}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-[100px] -z-10 group-hover:bg-blue-500/20 transition-colors"></div>
          <CardHeader className="pb-0 pt-6">
            <div className="p-4 bg-blue-500/20 rounded-2xl w-fit text-blue-400 mb-4 group-hover:scale-110 transition-transform">
              <ShoppingCart className="h-8 w-8" />
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold text-white mb-2">Main Vault</h3>
            <p className="text-slate-400 mb-6 min-h-[40px]">Manage standard inventory and execute daily retail sales.</p>
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-sm uppercase tracking-wider text-slate-500 font-semibold">Today's Sales Count</div>
                <div className="text-xl font-bold text-blue-400">{dashboard.daily_sales || 0}</div>
              </div>
              <Button className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25">
                Open Vault
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ACTIVE EVENT CARD */}
        <Card
          className={`relative overflow-hidden border border-white/10 backdrop-blur-md rounded-3xl group transition-all duration-500 cursor-pointer ${activeEvent
              ? "bg-gradient-to-br from-slate-900/90 to-yellow-900/40 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(234,179,8,0.3)]"
              : "bg-slate-900/80"
            }`}
          onClick={() => setCurrentView("event-vault")}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-bl-[100px] -z-10 group-hover:bg-yellow-500/20 transition-colors"></div>
          <CardHeader className="pb-0 pt-6">
            <div className="flex justify-between items-start">
              <div className={`p-4 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform ${activeEvent ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800 text-slate-500'}`}>
                <Calendar className="h-8 w-8" />
              </div>
              <Badge className={`${activeEvent ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-slate-500 border border-white/10'} px-3 py-1 uppercase tracking-widest`}>
                {activeEvent ? 'Running' : 'Offline'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold text-white mb-2">Event Vault</h3>
            <p className="text-slate-400 mb-6 min-h-[40px]">
              {activeEvent ? `Currently managing: ${activeEvent.name}` : 'Create, pack, and oversee special events.'}
            </p>
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-sm uppercase tracking-wider text-slate-500 font-semibold">Event Revenue</div>
                <div className={`text-xl font-bold ${activeEvent ? 'text-yellow-400' : 'text-slate-600'}`}>
                  ₹{activeEvent ? eventDash?.revenue || 0 : 0}
                </div>
              </div>
              <Button className={`rounded-xl ${activeEvent ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg shadow-yellow-600/25' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                Manage Event
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* EVENT SELLING / USER VAULT */}
        <Card
          className={`relative overflow-hidden border border-white/10 backdrop-blur-md rounded-3xl group transition-all duration-500 ${activeEvent
              ? "bg-slate-900/80 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.3)] cursor-pointer"
              : "bg-slate-900/50 opacity-60 cursor-not-allowed grayscale-[50%]"
            }`}
          onClick={() => activeEvent && setCurrentView("user-vault")}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-[100px] -z-10 group-hover:bg-emerald-500/20 transition-colors"></div>
          <CardHeader className="pb-0 pt-6">
            <div className="flex justify-between items-start">
              <div className="p-4 bg-emerald-500/20 rounded-2xl w-fit text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <PlayCircle className="h-8 w-8" />
              </div>
              <Badge className={`${activeEvent ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-transparent text-slate-500'} px-3 py-1 uppercase tracking-widest`}>
                {activeEvent ? 'Ready to Sell' : 'Disabled'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold text-white mb-2">User Vault</h3>
            <p className="text-slate-400 mb-6 min-h-[40px]">Point of sale interface for executing transactions at active events.</p>
            <div className="mt-auto">
              <Button
                disabled={!activeEvent}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 h-12 text-lg font-bold"
              >
                {activeEvent ? 'Start Selling' : 'No Active Event'}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
