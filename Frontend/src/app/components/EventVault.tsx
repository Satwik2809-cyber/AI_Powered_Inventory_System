import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "../api";
import { toast } from "sonner";
import AISpeech from "./AISpeech";
import CameraScan from "./CameraScan";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./ui/select";

import {
  Calendar,
  Plus,
  Play,
  Pause,
  CheckCircle,
  Package,
  TrendingUp,
  MapPin,
  Clock,
  Banknote,
  Search,
  ShoppingCart,
  History,
  Store,
  ArrowLeft,
  Download,
  FileText,
  X
} from "lucide-react";

/* ---------------- TYPES (MATCH BACKEND) ---------------- */

interface Event {
  id: number;
  name: string;
  mode: "single-day" | "multi-day";
  open_sell: boolean;
  status: "Planned" | "Active" | "Paused" | "Completed" | "active" | "created" | "paused" | "completed" | "closed_pending_return" | "closed" | "packing";
  start_date: string;
  days?: number;
  current_day?: number;
  assigned_sellers?: { id: number; name: string }[];
}

/* ================= COMPONENT ================= */

export default function EventVault({ isAdmin }: { isAdmin?: boolean }) {

  const [events, setEvents] = useState<Event[]>([]);
  const [openedEvent, setOpenedEvent] = useState<Event | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [daySummary, setDaySummary] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedSellers, setSelectedSellers] = useState<number[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [packOpen, setPackOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [newEvent, setNewEvent] = useState({
    name: "", mode: "single-day", open_sell: true, start_date: new Date().toISOString().split("T")[0], days: 2,
  });

  const [packData, setPackData] = useState({ product_name: "", quantity: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [packCart, setPackCart] = useState<any[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [returnConfirmOpen, setReturnConfirmOpen] = useState(false);
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [remainingStock, setRemainingStock] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ name: "", mode: "single-day", start_date: "", days: 2 });

  /* ---------------- LOAD EVENTS ---------------- */
  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    try {
      const data = await apiGet("/events");
      setEvents(data);
    } catch {
      toast.error("Failed to load events");
    }
  }

  /* ---------------- CREATE EVENT ---------------- */
  async function createEvent() {
    if (!newEvent.name) return toast.error("Enter event name");
    try {
      await apiPost("/events", newEvent);
      toast.success("Event created");
      setCreateOpen(false);
      setNewEvent({ name: "", mode: "single-day", open_sell: true, start_date: new Date().toISOString().split("T")[0], days: 2 });
      loadEvents();
    } catch {
      toast.error("Event creation failed");
    }
  }

  /* ---------------- OPEN EVENT ---------------- */
  async function openEvent(eventId: number) {
    try {
      const event = await apiGet(`/events/${eventId}`);
      setOpenedEvent(event);
      const stock = await apiGet("/products");
      setProducts(stock);
      await loadEvents();
      const usersData = await apiGet("/users");
      setUsers(usersData);

      if (event.assigned_sellers) {
        setSelectedSellers(event.assigned_sellers.map((s: any) => s.id));
      } else {
        setSelectedSellers([]);
      }

      loadRemainingStock(event.name);

      try {
        const dash = await apiGet(`/events/live-dashboard/${eventId}`);
        setDashboard(dash);
      } catch { setDashboard(null); }
    } catch { toast.error("Failed to open event"); }
  }

  async function loadRemainingStock(eventName: string) {
    try {
      const data = await apiGet(`/events/remaining-stock?event_name=${encodeURIComponent(eventName)}`);
      setRemainingStock(data.remaining_stock || []);
    } catch (err) { console.error("Failed to load remaining stock"); }
  }

  async function loadHistory() {
    if (!openedEvent) return;
    try {
      const data = await apiGet(`/events/stock-history?event_name=${encodeURIComponent(openedEvent.name)}`);
      setStockHistory(data.history || []);
      setHistoryOpen(true);
    } catch (err) { toast.error("Failed to load packing history."); }
  }

  /* ---------------- PACK ITEM ---------------- */
  function addToPackCart() {
    if (!packData.product_name) return toast.error("Select a product");
    if (packData.quantity <= 0) return toast.error("Invalid quantity");

    const selectedProduct = products.find(p => p.name === packData.product_name);
    if (!selectedProduct) return toast.error("Product not found");
    if (packData.quantity > selectedProduct.quantity) return toast.error(`Not enough stock (Only ${selectedProduct.quantity} available)`);

    setPackCart([...packCart, { name: selectedProduct.name, category: selectedProduct.category, rate: selectedProduct.rate, quantity: packData.quantity }]);
    setPackData({ product_name: "", quantity: 0 });
    setSearchTerm("");
  }

  function handleAddPackItems(scannedItems: { name: string; quantity: number }[]) {
    let addedCount = 0;
    let newCart = [...packCart];
    scannedItems.forEach(scanned => {
      let matchedProducts = products.filter(p => p.name.toLowerCase() === scanned.name.toLowerCase() || p.name.toLowerCase().includes(scanned.name.toLowerCase()));
      if (matchedProducts.length === 1) {
        const p = matchedProducts[0];
        if (scanned.quantity <= p.quantity) {
          newCart.push({ name: p.name, category: p.category, rate: p.rate, quantity: scanned.quantity });
          addedCount++;
          toast.success(`${p.name} added via AI`);
        } else {
          toast.error(`Not enough stock for ${scanned.name} (Only ${p.quantity} available)`);
        }
      } else if (matchedProducts.length > 1) {
        toast.error(`Multiple matches for ${scanned.name}`);
      } else {
        toast.error(`Item ${scanned.name} not found`);
      }
    });
    if (addedCount > 0) setPackCart(newCart);
  }

  function removeFromPackCart(index: number) {
    const newCart = [...packCart];
    newCart.splice(index, 1);
    setPackCart(newCart);
  }

  async function confirmPackCart() {
    if (!openedEvent) return;
    if (packCart.length === 0) return toast.error("Cart is empty");

    const userStr = localStorage.getItem("user");
    const userId = userStr ? JSON.parse(userStr).id : 1;

    try {
      await apiPost(`/events/pack?event_name=${encodeURIComponent(openedEvent.name)}&user_id=${userId}`, packCart);
      toast.success(`${packCart.length} items packed!`);
      openEvent(openedEvent.id);
      setPackOpen(false);
      setPackCart([]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Packing failed");
    }
  }

  async function changeStatus(status: string) {
    if (!openedEvent) return;
    try {
      await apiPut(`/events/${openedEvent.id}/status`, { status });
      toast.success(`Event ${status}`);
      openEvent(openedEvent.id);
      loadEvents();
    } catch { toast.error("Status update failed"); }
  }

  async function assignSellers() {
    try {
      await apiPost("/events/assign-sellers", { event_id: openedEvent.id, seller_ids: selectedSellers });
      toast.success("Sellers assigned");
      openEvent(openedEvent.id);
    } catch { toast.error("Assignment failed"); }
  }

  async function returnStock() {
    if (!openedEvent) return;
    try {
      await apiPost(`/events/return-stock?event_name=${encodeURIComponent(openedEvent.name)}`, {});
      toast.success("Remaining stock returned");
      setOpenedEvent(null);
      setReturnConfirmOpen(false);
      loadEvents();
    } catch { toast.error("Return failed"); }
  }

  async function downloadReport() {
    if (!openedEvent) return;
    try {
      // Create an explicit anchor element to trigger the browser download
      const response = await fetch(`http://localhost:8000/events/summary/excel/${encodeURIComponent(openedEvent.name)}`, {
        method: "GET",
        headers: {
          "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Event_Summary_${openedEvent.name.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast.success("Report Downloaded Successfully");
    } catch { toast.error("Failed to download report"); }
  }

  async function updateEventDetails() {
    if (!openedEvent) return;
    try {
      await apiPut(`/events/${openedEvent.id}/details`, editData);
      toast.success("Event details updated");
      setEditOpen(false);
      openEvent(openedEvent.id);
      loadEvents();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Update failed");
    }
  }

  const getStatusColor = (s: string) => {
    const l = s.toLowerCase();
    if (l === 'active') return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    if (l === 'planned' || l === 'created' || l === 'packing') return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    if (l === 'paused') return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
    return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
  }

  /* ================= LIST VIEW ================= */
  if (!openedEvent) {
    const activeEvents = events.filter(e => e.status.toLowerCase() === "active");
    const plannedEvents = events.filter(e => e.status.toLowerCase() === "planned" || e.status.toLowerCase() === "created" || e.status.toLowerCase() === "packing");
    const pausedEvents = events.filter(e => e.status.toLowerCase() === "paused");
    const completedEvents = events.filter(e => e.status.toLowerCase() === "completed" || e.status.toLowerCase() === "closed_pending_return" || e.status.toLowerCase() === "closed");

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">

        {/* HEADER SECTION (GLASSMORPHIC) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/80 via-purple-900/80 to-slate-900/80 p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/30 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="h-8 w-8 text-purple-400" />
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-white tracking-tight">
                  Event Vault
                </h1>
              </div>
              <p className="text-purple-200/80 text-lg max-w-xl">
                Create offline events, pack portable inventory, and manage remote sales.
              </p>
            </div>

            {isAdmin && (
              <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25 h-12 px-6 rounded-xl font-bold border-0 hover:scale-105 transition-transform duration-300">
                <Plus className="h-5 w-5 mr-2" /> New Setup
              </Button>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-white/10 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Play className="w-16 h-16 text-emerald-500" /></div>
            <p className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-2">Active</p>
            <p className="text-4xl font-black text-emerald-400">{activeEvents.length}</p>
          </div>
          <div className="bg-slate-900/80 border border-white/10 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Calendar className="w-16 h-16 text-blue-500" /></div>
            <p className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-2">Planned</p>
            <p className="text-4xl font-black text-blue-400">{plannedEvents.length}</p>
          </div>
          <div className="bg-slate-900/80 border border-white/10 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Pause className="w-16 h-16 text-orange-500" /></div>
            <p className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-2">Paused</p>
            <p className="text-4xl font-black text-orange-400">{pausedEvents.length}</p>
          </div>
          <div className="bg-slate-900/80 border border-white/10 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle className="w-16 h-16 text-purple-500" /></div>
            <p className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-2">Completed</p>
            <p className="text-4xl font-black text-purple-400">{completedEvents.length}</p>
          </div>
        </div>

        {/* EVENT GRID */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {events.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-500 font-medium">No events created yet. Start by setting one up!</div>
          ) : events.map((e) => (
            <div key={e.id} className="relative group cursor-pointer" onClick={() => openEvent(e.id)}>
              <div className="absolute -inset-0.5 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <div className="h-full bg-slate-900/90 border border-white/10 backdrop-blur-xl rounded-3xl p-6 relative flex flex-col hover:-translate-y-2 transition-all duration-300">

                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-white truncate pr-2 group-hover:text-purple-300 transition-colors" title={e.name}>{e.name}</h3>
                  <Badge className={`uppercase tracking-widest text-[10px] ${getStatusColor(e.status)}`}>{e.status}</Badge>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-center text-slate-400 text-sm">
                    <Clock className="w-4 h-4 mr-2 text-purple-400/70" /> {e.mode === 'multi-day' ? 'Multi Day' : 'Single Day'}
                  </div>
                  <div className="flex items-center text-slate-400 text-sm">
                    <Store className="w-4 h-4 mr-2 text-purple-400/70" /> {e.open_sell ? "Global Access Mode" : "Restricted Staff Mode"}
                  </div>
                  <div className="flex items-center text-slate-400 text-sm">
                    <Calendar className="w-4 h-4 mr-2 text-purple-400/70" /> {new Date(e.start_date).toLocaleDateString()}
                  </div>
                </div>

                <Button className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl" onClick={(ev) => { ev.stopPropagation(); openEvent(e.id); }}>
                  Manage Event <TrendingUp className="w-4 h-4 ml-2 opacity-50" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* CREATE EVENT DIALOG */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-[450px] bg-slate-900/95 border border-white/20 text-white backdrop-blur-3xl rounded-3xl shadow-2xl">
            <DialogHeader className="pb-4 border-b border-white/10">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2"><Plus className="text-purple-400" /> Initialize Setup</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs uppercase tracking-widest font-bold">Event Name</Label>
                <Input className="bg-black/30 border-white/10 text-white focus:border-purple-500 rounded-xl h-12" value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs uppercase tracking-widest font-bold">Duration Mode</Label>
                  <Select value={newEvent.mode} onValueChange={(v) => setNewEvent({ ...newEvent, mode: v as any })}>
                    <SelectTrigger className="bg-black/30 border-white/10 text-white focus:ring-purple-500 rounded-xl h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10 text-white">
                      <SelectItem value="single-day">Single Day</SelectItem>
                      <SelectItem value="multi-day">Multi Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs uppercase tracking-widest font-bold">Access Level</Label>
                  <Select value={String(newEvent.open_sell)} onValueChange={(v) => setNewEvent({ ...newEvent, open_sell: v === "true" })}>
                    <SelectTrigger className="bg-black/30 border-white/10 text-white focus:ring-purple-500 rounded-xl h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10 text-white">
                      <SelectItem value="true">Open (Global)</SelectItem>
                      <SelectItem value="false">Restricted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs uppercase tracking-widest font-bold">Expected Start Date</Label>
                <Input type="date" className="bg-black/30 border-white/10 text-white focus:border-purple-500 [color-scheme:dark] rounded-xl h-12" value={newEvent.start_date} onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })} />
              </div>
              {newEvent.mode === "multi-day" && (
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs uppercase tracking-widest font-bold">Total Days</Label>
                  <Input type="number" min="2" className="bg-black/30 border-white/10 text-white focus:border-purple-500 rounded-xl h-12" value={newEvent.days} onChange={(e) => setNewEvent({ ...newEvent, days: parseInt(e.target.value, 10) || 2 })} />
                </div>
              )}
              <Button onClick={createEvent} className="w-full h-14 mt-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(147,51,234,0.3)] border-0">
                Deploy Configuration
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ================= OPENED EVENT VIEW =================
  const isCompleted = openedEvent.status.toLowerCase() === 'completed' || openedEvent.status.toLowerCase() === 'closed' || openedEvent.status.toLowerCase() === 'closed_pending_return';

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500 max-w-7xl mx-auto">

      {/* HEADER SECTION (GLASSMORPHIC) */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3" />

        <div className="relative z-10">
          <Button variant="ghost" className="mb-6 text-slate-400 hover:text-white px-0 hover:bg-transparent" onClick={() => setOpenedEvent(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Workspace
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
                {openedEvent.name}
              </h1>
              <div className="flex items-center gap-3 mb-3">
                <Badge className={`uppercase tracking-widest text-xs px-3 py-1 border ${getStatusColor(openedEvent.status)}`}>{openedEvent.status}</Badge>
                <span className="text-slate-400 text-sm hidden sm:inline">• Started {new Date(openedEvent.start_date).toLocaleDateString()}</span>
                <span className="text-slate-400 text-sm hidden sm:inline">• {openedEvent.mode === 'multi-day' ? `${openedEvent.days} Days` : '1 Day'}</span>
                {openedEvent.open_sell && openedEvent.assigned_sellers && openedEvent.assigned_sellers.length > 0 && (
                  <span className="text-indigo-300 text-sm bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                    Assigned: {openedEvent.assigned_sellers.map(s => s.name).join(', ')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {isAdmin && ['created', 'packing', 'paused', 'planned'].includes(openedEvent.status.toLowerCase()) && (
                <Button onClick={() => changeStatus("active")} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 px-6 h-12 font-bold">
                  <Play className="w-4 h-4 mr-2" /> Activate Set
                </Button>
              )}
              {isAdmin && openedEvent.status.toLowerCase() === 'active' && (
                <Button onClick={() => changeStatus("paused")} className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20 px-6 h-12 font-bold">
                  <Pause className="w-4 h-4 mr-2" /> Suspend Day
                </Button>
              )}
              {isAdmin && !isCompleted && openedEvent.status.toLowerCase() !== 'closed_pending_return' && (
                <Button onClick={() => changeStatus("closed")} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 px-6 h-12 font-bold">
                  <CheckCircle className="w-4 h-4 mr-2" /> Stop Sales
                </Button>
              )}
              {isAdmin && (!isCompleted || openedEvent.status.toLowerCase() === 'closed_pending_return' || openedEvent.status.toLowerCase() === 'closed') && (
                <Button onClick={() => setReturnConfirmOpen(true)} className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20 px-6 h-12 font-bold animate-pulse">
                  <CheckCircle className="w-4 h-4 mr-2" /> Conclude Event & Return Stock
                </Button>
              )}
              {isCompleted && (
                <>
                  {isAdmin && (
                    <Button onClick={() => {
                      setEditData({
                        name: openedEvent.name,
                        mode: openedEvent.mode,
                        start_date: openedEvent.start_date.split("T")[0],
                        days: openedEvent.days || 1
                      });
                      setEditOpen(true);
                    }} className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-4 h-12 shadow-lg shadow-slate-900/40">
                      Edit Settings
                    </Button>
                  )}
                </>
              )}
              
              <Button onClick={downloadReport} className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-6 h-12 font-bold shadow-lg shadow-slate-900/40">
                <Download className="w-4 h-4 mr-2" /> Download Report
              </Button>

              {!isCompleted && (
                <Button onClick={() => setPackOpen(true)} className="bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl px-6 h-12">
                  <Package className="w-4 h-4 mr-2" /> Inject Stock
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN: STOCK OVERVIEW */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-slate-900/80 border border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl">
            <CardHeader className="bg-white/5 border-b border-white/10 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2"><Package className="text-purple-400 w-5 h-5" /> Live Inventory</CardTitle>
              <Button variant="ghost" size="icon" className="hover:bg-white/10 text-slate-400" onClick={loadHistory}><History className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-4 space-y-3">
                {remainingStock.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No items dispatched yet</p>
                  </div>
                ) : remainingStock.map((s, idx) => (
                  <div key={idx} className="bg-black/20 border border-white/5 p-4 rounded-2xl flex justify-between items-center group hover:bg-white/5 transition-colors">
                    <div>
                      <p className="font-bold text-white group-hover:text-purple-300 transition-colors">{s.name}</p>
                      <p className="text-xs text-slate-500 mt-1">₹{s.rate} ea</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-emerald-400">{s.quantity_remaining}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Avail</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: ANALYTICS & SUMMARY */}
        <div className="lg:col-span-2 space-y-6">
          {isCompleted ? (
            <Card className="bg-slate-900/80 border border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl">
              <div className="p-1 h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-500 absolute top-0"></div>
              <CardHeader className="py-6 border-b border-white/10">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl font-bold text-white flex items-center gap-2"><TrendingUp className="text-indigo-400" /> Final Reconciliation</CardTitle>
                  <Button onClick={async () => {
                    try {
                      const data = await apiGet(`/events/summary/${encodeURIComponent(openedEvent.name)}`);
                      setDaySummary(data);
                    } catch { toast.error("Failed to load full summary"); }
                  }} className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl">Refresh Data</Button>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {daySummary && daySummary.financials ? (
                  <div className="space-y-8 animate-in fade-in duration-500">

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/20 p-6 rounded-2xl shadow-inner">
                        <p className="text-indigo-200/70 text-sm uppercase tracking-widest font-bold mb-2">Total Gross</p>
                        <h2 className="text-4xl font-black text-white">₹{daySummary.financials.grand_total.toLocaleString()}</h2>
                      </div>
                      <div className="bg-black/20 border border-white/5 p-6 rounded-2xl shadow-inner">
                        <p className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-2 flex items-center gap-2"><Banknote className="w-4 h-4 text-emerald-400" /> Cash Intakes</p>
                        <h2 className="text-3xl font-bold text-emerald-400">₹{daySummary.financials.total_cash.toLocaleString()}</h2>
                      </div>
                      <div className="bg-black/20 border border-white/5 p-6 rounded-2xl shadow-inner">
                        <p className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-2 flex items-center gap-2"><Banknote className="w-4 h-4 text-blue-400" /> UPI / Online</p>
                        <h2 className="text-3xl font-bold text-blue-400">₹{daySummary.financials.total_online.toLocaleString()}</h2>
                      </div>
                    </div>

                    {daySummary.recent_restocks && daySummary.recent_restocks.length > 0 && (
                      <div className="bg-purple-900/20 rounded-2xl border border-purple-500/20 p-6 mt-6">
                        <h4 className="font-bold text-white mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-purple-400" /> Restocked After Start</h4>
                        <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                          {daySummary.recent_restocks.map((r: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-black/40 border border-white/5 p-3 rounded-xl">
                              <div className="truncate pr-2">
                                <span className="font-bold text-white block">{r.product_name}</span>
                                <span className="text-xs text-purple-300 font-mono tracking-widest">{new Date(r.date).toLocaleString()} by {r.packed_by}</span>
                              </div>
                              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-lg px-3 py-1">
                                +{r.quantity}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {daySummary.mode === "multi-day" && Object.keys(daySummary.day_wise).length > 0 && (
                      <div className="bg-black/20 rounded-2xl border border-white/5 p-6">
                        <h4 className="font-bold text-white mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-400" /> Performance Matrix</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-white/10 text-slate-400 text-sm uppercase tracking-wider">
                                <th className="pb-3 font-semibold text-center w-24">Cycle</th>
                                <th className="pb-3 font-semibold text-right">Physical Cash</th>
                                <th className="pb-3 font-semibold text-right">Digital Trx</th>
                                <th className="pb-3 font-semibold text-right text-purple-300">Volume</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {Object.entries(daySummary.day_wise).map(([day, totals]: any) => (
                                <tr key={day} className="hover:bg-white/5 transition-colors">
                                  <td className="py-4 text-center">
                                    <Badge className="bg-slate-800 text-slate-300">Day {day}</Badge>
                                  </td>
                                  <td className="py-4 text-right text-emerald-400">₹{totals.cash.toLocaleString()}</td>
                                  <td className="py-4 text-right text-blue-400">₹{totals.online.toLocaleString()}</td>
                                  <td className="py-4 text-right font-bold text-white">₹{totals.total.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {daySummary.stock_summary && daySummary.stock_summary.length > 0 && (
                      <div className="bg-black/20 rounded-2xl border border-white/5 p-6 mt-6">
                        <h4 className="font-bold text-white mb-4 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-emerald-400" /> Itemized Sales Breakdown</h4>
                        <div className="overflow-x-auto max-h-80 custom-scrollbar">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-white/10 text-slate-400 text-sm uppercase tracking-wider sticky top-0 bg-slate-900/90 backdrop-blur-sm z-10">
                                <th className="pb-3 pt-2 font-semibold text-left">Item Name</th>
                                <th className="pb-3 pt-2 font-semibold text-left">Category</th>
                                <th className="pb-3 pt-2 font-semibold text-right">Sold Qty</th>
                                <th className="pb-3 pt-2 font-semibold text-right text-emerald-300">Revenue</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {daySummary.stock_summary.filter((s: any) => s.quantity_sold > 0).map((s: any, idx: number) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                  <td className="py-3 pr-2 font-bold text-white text-sm whitespace-nowrap">{s.product_name}</td>
                                  <td className="py-3"><Badge variant="outline" className="text-[10px] text-emerald-300 border-emerald-500/30 uppercase">{s.category}</Badge></td>
                                  <td className="py-3 text-right font-bold text-white">{s.quantity_sold} <span className="text-xs text-slate-500">units</span></td>
                                  <td className="py-3 text-right font-bold text-emerald-400">₹{(s.quantity_sold * s.rate).toLocaleString()}</td>
                                </tr>
                              ))}
                              {daySummary.stock_summary.filter((s: any) => s.quantity_sold > 0).length === 0 && (
                                <tr><td colSpan={4} className="text-center py-4 text-slate-500">No items sold yet.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* ADMIN EVENT EDIT CONTROLS */}
                    <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 mt-6">
                      <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                        <Store className="w-5 h-5 text-rose-400" /> Administrative Corrections
                      </h4>
                      <p className="text-slate-400 text-sm mb-4">Make post-event adjustments to rectify counting anomalies.</p>
                      <div className="flex gap-4">
                        <Button
                          onClick={() => toast.info("Navigate to Main Vault to adjust specific global items if stock was returned improperly. Event sales are permanently stamped.")}
                          className="bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl"
                        >
                          How to perform audits?
                        </Button>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">Click refresh to load reconciliation data automatically.</div>
                )}
              </CardContent>
            </Card>
          ) : openedEvent.mode === "single-day" ? (
            <Card className="bg-slate-900/80 border border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl text-center p-8">
              <div className="w-20 h-20 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-6">
                <TrendingUp className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Live Day Telemetry</h3>
              <p className="text-slate-400 mb-8 max-w-sm mx-auto">Pull current transaction data for this operational window directly from the ledger.</p>

              <Button onClick={async () => {
                const data = await apiGet(`/events/day/summary/admin?event_name=${encodeURIComponent(openedEvent.name)}&day_number=1`);
                setDaySummary(data);
              }} className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-purple-500/20 mb-8">
                Fetch Now
              </Button>

              {daySummary && (
                <div className="space-y-6 text-left">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 border border-white/5 rounded-2xl p-6 text-center">
                      <p className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-2">Operations</p>
                      <h2 className="text-3xl font-black text-white">{daySummary.sales || "0"}</h2>
                    </div>
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6 text-center">
                      <p className="text-indigo-300 text-sm uppercase tracking-widest font-bold mb-2">Revenue</p>
                      <h2 className="text-3xl font-black text-emerald-400">₹{daySummary.grand_total?.toLocaleString()}</h2>
                    </div>
                  </div>

                  {/* ITEM GRID */}
                  {daySummary.stock_summary && daySummary.stock_summary.length > 0 && (
                    <div className="bg-black/20 rounded-2xl border border-white/5 p-6">
                      <h4 className="font-bold text-white mb-4 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-emerald-400" /> Items Sold</h4>
                      <div className="overflow-x-auto max-h-60 custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-slate-400 text-sm uppercase tracking-wider sticky top-0 bg-slate-900/90 backdrop-blur-sm z-10">
                              <th className="pb-3 pt-2 font-semibold text-left">Item Name</th>
                              <th className="pb-3 pt-2 font-semibold text-right">Qty</th>
                              <th className="pb-3 pt-2 font-semibold text-right">Rate</th>
                              <th className="pb-3 pt-2 font-semibold text-right text-emerald-300">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {daySummary.stock_summary.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-white/5 transition-colors">
                                <td className="py-3 pr-2 font-bold text-white text-sm whitespace-nowrap">{item.product_name}</td>
                                <td className="py-3 text-right font-bold text-white">{item.quantity_sold}</td>
                                <td className="py-3 text-right text-slate-400 text-sm">₹{item.rate}</td>
                                <td className="py-3 text-right font-bold text-emerald-400">₹{item.total_price.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* USER GRID */}
                  {daySummary.user_wise_total && Object.keys(daySummary.user_wise_total).length > 0 && (
                    <div className="bg-black/20 rounded-2xl border border-white/5 p-6">
                      <h4 className="font-bold text-white mb-4 flex items-center gap-2"><Store className="w-5 h-5 text-blue-400" /> Seller Contribution</h4>
                      <div className="space-y-3">
                        {Object.entries(daySummary.user_wise_total).map(([username, stats]: any) => (
                          <div key={username} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                            <div>
                                <p className="font-bold text-white">{username}</p>
                                <p className="text-xs text-slate-400">{stats.sales_count} sales processed</p>
                            </div>
                            <span className="text-blue-400 font-bold text-xl">₹{stats.total_amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {Array.from({ length: openedEvent.days || 1 }).map((_, i) => {
                const day = i + 1;
                const isSelected = selectedDay === day;
                return (
                  <div
                    key={day}
                    className={`relative overflow-hidden border cursor-pointer group transition-all duration-300 rounded-3xl p-6 text-center ${isSelected ? 'bg-indigo-900/40 border-indigo-500/50 shadow-xl shadow-indigo-500/10' : 'bg-slate-900/60 border-white/10 hover:bg-slate-800'}`}
                    onClick={async () => {
                      const data = await apiGet(`/events/day/summary/admin?event_name=${encodeURIComponent(openedEvent.name)}&day_number=${day}`);
                      setDaySummary(data);
                      setSelectedDay(day);
                    }}
                  >
                    <h3 className={`text-xl font-bold mb-2 ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>Phase {day}</h3>
                    {isSelected && daySummary ? (
                      <div className="animate-in fade-in zoom-in duration-300 mt-4 text-left">
                        <div className="flex justify-between items-center mb-2">
                           <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-lg px-4 py-1">₹{daySummary.grand_total?.toLocaleString()}</Badge>
                           <p className="text-xs text-indigo-300 uppercase tracking-widest">{daySummary.sales} operations</p>
                        </div>
                        
                        {daySummary.stock_summary && daySummary.stock_summary.length > 0 && (
                          <div className="mt-4 bg-black/30 p-3 rounded-xl border border-white/5">
                            <p className="text-xs font-bold text-slate-400 mb-2 uppercase">Items Sold Grid</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                              {daySummary.stock_summary.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                                    <div className="w-2/3 pr-1">
                                        <p className="text-sm font-bold text-white truncate">{item.product_name}</p>
                                        <p className="text-[10px] text-slate-400">₹{item.rate} x {item.quantity_sold}</p>
                                    </div>
                                    <p className="w-1/3 text-sm font-bold text-emerald-400 text-right truncate">₹{item.total_price.toLocaleString()}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {daySummary.user_wise_total && Object.keys(daySummary.user_wise_total).length > 0 && (
                          <div className="mt-4 bg-black/30 p-3 rounded-xl border border-white/5">
                            <p className="text-xs font-bold text-slate-400 mb-2 uppercase">Seller Contribution</p>
                            <div className="space-y-2">
                              {Object.entries(daySummary.user_wise_total).map(([username, stats]: any) => (
                                <div key={username} className="flex justify-between items-center text-sm">
                                  <span className="text-white truncate w-2/3">{username} <span className="text-[10px] text-slate-500 ml-1">({stats.sales_count} sales)</span></span>
                                  <span className="text-blue-400 font-bold w-1/3 text-right truncate">₹{stats.total_amount.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Tap to load telemetry</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* PACK DIALOG */}
      <Dialog open={packOpen} onOpenChange={setPackOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900/95 border border-white/20 text-white backdrop-blur-3xl rounded-3xl shadow-2xl">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2"><Package className="text-purple-400" /> Provision Resources</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs uppercase tracking-widest font-bold">Registry Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <Input placeholder="Enter core product name..." className="pl-10 h-12 bg-black/30 border-white/10 text-white focus:border-purple-500 rounded-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <div className="bg-black/30 border border-white/5 rounded-2xl max-h-48 overflow-y-auto custom-scrollbar p-2">
              {products.filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase())).map((p) => (
                <div key={p.id} className={`p-3 cursor-pointer rounded-xl flex justify-between items-center transition-colors mb-1 ${packData.product_name === p.name ? 'bg-purple-600/30 border border-purple-500/50' : 'hover:bg-white/5 border border-transparent'}`} onClick={() => setPackData({ ...packData, product_name: p.name })}>
                  <span className="font-bold text-white">{p.name}</span>
                  <Badge variant="outline" className={`${p.quantity <= 10 ? 'text-rose-400 border-rose-500/30 bg-rose-500/10' : 'text-slate-400 border-white/10'}`}>{p.quantity} Units Base</Badge>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-xs uppercase tracking-widest font-bold">Allocation Amount</Label>
              <Input type="number" className="h-12 bg-black/30 border-white/10 text-white focus:border-purple-500 rounded-xl font-bold text-lg" value={packData.quantity || ''} onChange={(e) => setPackData({ ...packData, quantity: Number(e.target.value) })} />
            </div>

            <Button onClick={addToPackCart} className="w-full h-12 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl font-bold" disabled={!packData.product_name || packData.quantity <= 0}>
              Commit to Stack
            </Button>

            <div className="flex gap-2 mt-2">
              <div className="flex-1">
                <AISpeech 
                  context="packing" 
                  userId={localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!).id : 1}
                  onFill={(data: any) => {
                    if (data?.name) setPackData(prev => ({ ...prev, product_name: data.name }));
                    if (data?.quantity) setPackData(prev => ({ ...prev, quantity: data.quantity }));
                  }}
                  onAddItems={handleAddPackItems}
                  onRemoveItems={(itemsToRemove) => {
                    let updatedCart = [...packCart];
                    itemsToRemove.forEach(scanned => {
                      const idx = updatedCart.findIndex(c => c.name.toLowerCase().includes(scanned.name.toLowerCase()));
                      if (idx !== -1) updatedCart.splice(idx, 1);
                    });
                    setPackCart(updatedCart);
                    toast.success("Removed items");
                  }}
                />
              </div>
              <div className="flex-1 h-10 flex border border-white/10 rounded-md bg-white/5 overflow-hidden">
                <CameraScan 
                  onAutoMatch={(p) => {
                    setPackData({ product_name: p.name, quantity: 1 });
                  }}
                  onConfirmMatch={(options) => {
                    if (options.length > 0) {
                      setPackData({ product_name: options[0].name, quantity: 1 });
                    }
                  }}
                />
              </div>
            </div>

            {packCart.length > 0 && (
              <div className="mt-6 bg-purple-500/5 border border-purple-500/20 rounded-2xl p-4">
                <h4 className="font-bold text-white mb-3 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-purple-400" /> Pending Allocations</h4>
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto custom-scrollbar">
                  {packCart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-black/40 border border-white/5 p-3 rounded-xl">
                      <div className="truncate pr-2">
                        <span className="font-bold text-white block">{item.name}</span>
                        <span className="text-xs text-purple-300 font-mono tracking-widest">{item.quantity} DEPL</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-lg" onClick={() => removeFromPackCart(idx)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button onClick={confirmPackCart} className="w-full h-12 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.3)] border-0">
                  Inject Payload
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* HISTORY DIALOG */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-xl bg-slate-900/95 border border-white/20 text-white backdrop-blur-3xl rounded-3xl shadow-2xl">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2"><History className="text-purple-400" /> Operational Logistics Ledger</DialogTitle>
          </DialogHeader>
          <div className="max-h-[500px] overflow-y-auto mt-4 pr-2 space-y-3 custom-scrollbar">
            {stockHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-500 italic">No movement recorded yet.</div>
            ) : (
              stockHistory.map((h, idx) => (
                <div key={idx} className="flex justify-between items-center bg-black/30 border border-white/5 p-4 rounded-2xl">
                  <div>
                    <p className="font-bold text-white text-lg">{h.product_name}</p>
                    <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-mono">Agent: {h.packed_by} • {new Date(h.created_at).toLocaleString()}</p>
                  </div>
                  <div className={`text-xl font-black ${h.action === "packed" ? "text-emerald-400" : "text-rose-400"}`}>
                    {h.action === "packed" ? "+" : "-"}{h.quantity}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[450px] bg-slate-900/95 border border-white/20 text-white backdrop-blur-3xl rounded-3xl shadow-2xl">
          <DialogHeader className="pb-4 border-b border-white/10">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2"><Store className="text-purple-400" /> Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs uppercase tracking-widest font-bold">Event Name</Label>
              <Input className="bg-black/30 border-white/10 text-white focus:border-purple-500 rounded-xl h-12" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs uppercase tracking-widest font-bold">Duration Mode</Label>
                <Select value={editData.mode} onValueChange={(v) => setEditData({ ...editData, mode: v as any })}>
                  <SelectTrigger className="bg-black/30 border-white/10 text-white focus:ring-purple-500 rounded-xl h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10 text-white">
                    <SelectItem value="single-day">Single Day</SelectItem>
                    <SelectItem value="multi-day">Multi Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs uppercase tracking-widest font-bold">Expected Start Date</Label>
                <Input type="date" className="bg-black/30 border-white/10 text-white focus:border-purple-500 [color-scheme:dark] rounded-xl h-12" value={editData.start_date} onChange={(e) => setEditData({ ...editData, start_date: e.target.value })} />
              </div>
            </div>
            {editData.mode === "multi-day" && (
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs uppercase tracking-widest font-bold">Total Days</Label>
                <Input type="number" min="2" className="bg-black/30 border-white/10 text-white focus:border-purple-500 rounded-xl h-12" value={editData.days} onChange={(e) => setEditData({ ...editData, days: parseInt(e.target.value, 10) || 2 })} />
              </div>
            )}
            <Button onClick={updateEventDetails} className="w-full h-14 mt-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(147,51,234,0.3)] border-0">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* RETURN CONFIRMATION DIALOG */}
      <Dialog open={returnConfirmOpen} onOpenChange={setReturnConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900/95 border border-white/20 text-white backdrop-blur-3xl rounded-3xl shadow-2xl">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-400"><MapPin className="text-rose-400" /> Confirm Conclusion</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-slate-300 text-sm">
              You are about to permanently conclude this event operations and inject all {remainingStock.reduce((sum, s) => sum + s.quantity_remaining, 0)} remaining items back into the <span className="text-indigo-300 font-bold">Main Vault</span> inventory pool.
            </p>
            <p className="text-rose-400 text-xs font-bold uppercase tracking-widest bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
              Warning: This action cannot be reversed
            </p>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
              <Button onClick={() => setReturnConfirmOpen(false)} variant="outline" className="h-12 border-white/10 bg-black/20 text-white hover:bg-white/10 rounded-xl">Hold On</Button>
              <Button onClick={returnStock} className="h-12 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold border-0">Force Conclusion</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
      `}</style>
    </div>
  );
}