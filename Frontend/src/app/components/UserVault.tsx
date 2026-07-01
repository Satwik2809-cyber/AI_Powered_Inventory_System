import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import AISpeech from "./AISpeech";
import CameraScan from "./CameraScan";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  ShoppingCart,
  Mic,
  Camera,
  Play,
  Square,
  Check,
  X,
  Store,
  CreditCard,
  Banknote,
  Search,
  Sparkles,
  Package,
  Gift,
  Bell,
  AlertTriangle
} from "lucide-react";

interface EventItem {
  name: string;
  category: string;
  rate: number;
  quantity_remaining: number;
  low_stock_alert: boolean;
  is_gift: boolean;
}

export default function UserVault({ currentUser }: any) {
  // State for available assigned events
  const [assignedEvents, setAssignedEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(() => localStorage.getItem("uv_selectedEventId") || "");
  const [selectedEventName, setSelectedEventName] = useState<string>(() => localStorage.getItem("uv_selectedEventName") || "");
  const [selectedEventMode, setSelectedEventMode] = useState<string>(() => localStorage.getItem("uv_selectedEventMode") || "single-day");
  const [selectedEventDays, setSelectedEventDays] = useState<number>(() => Number(localStorage.getItem("uv_selectedEventDays")) || 1);
  const [dayNumber, setDayNumber] = useState<string>(() => localStorage.getItem("uv_dayNumber") || "1");

  const [items, setItems] = useState<EventItem[]>([]);
  const [dayStarted, setDayStarted] = useState(() => localStorage.getItem("uv_dayStarted") === "true");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState<any[]>([]);

  const [sellName, setSellName] = useState("");
  const [sellQty, setSellQty] = useState("");
  const [sellRate, setSellRate] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [isGift, setIsGift] = useState(false);
  const [eventAlerts, setEventAlerts] = useState<any[]>([]);

  // State for Sales History Tab
  const [posTab, setPosTab] = useState<"cart" | "history">("cart");
  const [salesHistory, setSalesHistory] = useState<any[]>([]);

  const loadSalesHistory = async () => {
    if (!selectedEventName) return;
    try {
      const res = await apiGet(`/events/${encodeURIComponent(selectedEventName)}/sales/user/${currentUser.id}`);
      setSalesHistory(res.sales_history || []);
    } catch {
      console.error("Failed to load sales history.");
    }
  };

  useEffect(() => {
    if (selectedEventName && posTab === "history") {
      loadSalesHistory();
    }
  }, [selectedEventName, posTab]);

  useEffect(() => {
    async function loadAlerts() {
      if (!selectedEventName) {
        setEventAlerts([]);
        return;
      }
      try {
        const data = await apiGet("/alerts");
        // Filter alerts that mention this event name and are event type
        const filtered = data.filter((a: any) => 
          a.type === "event" && 
          a.message.toLowerCase().includes(selectedEventName.toLowerCase())
        );
        setEventAlerts(filtered);
      } catch (e) {
        // silently fail on alerts fetch
      }
    }
    loadAlerts();
    const interval = setInterval(loadAlerts, 20000);
    return () => clearInterval(interval);
  }, [selectedEventName]);

  // Load assigned events on mount
  useEffect(() => {
    loadAssignedEvents();
  }, []);

  async function loadAssignedEvents() {
    try {
      // Fetch all events for dropdown, filter to only those assigned to current user 
      // AND those that aren't closed/completed
      const allEvents = await apiGet(`/events`);

      // For area_wise events (open_sell is false), anyone can see them. The backend enforces area restrictions during sale.
      // For open_sell events (open_sell is true), only assigned sellers or admins can see them.
      const validEvents = allEvents.filter((e: any) => {
        const status = (e.status || "").toLowerCase();
        if (status !== 'active') return false;

        const userRole = currentUser?.role?.toLowerCase() || '';
        const isAdmin = userRole === 'admin';

        if (isAdmin) return true;

        // Whether open_sell or area-wise event, check if assigned
        return e.assigned_sellers?.some((seller: any) => String(seller.id) === String(currentUser.id));
      });

      setAssignedEvents(validEvents);

      // If there are exactly 1 valid events and nothing in localStorage, auto-select it. 
      // Or if previous selection is still valid, let the useEffect handle loading its stock.
      if (validEvents.length > 0) {
        const storedId = localStorage.getItem("uv_selectedEventId");
        const exists = validEvents.find((evt: any) => evt.id.toString() === storedId);

        if (!exists && validEvents.length === 1) {
          const ev = validEvents[0];
          setSelectedEventId(ev.id.toString());
          setSelectedEventName(ev.name);
          setSelectedEventMode(ev.mode || "single-day");
          setSelectedEventDays(ev.days || 1);
          setDayNumber("1");
          localStorage.setItem("uv_selectedEventId", ev.id.toString());
          localStorage.setItem("uv_selectedEventName", ev.name);
          localStorage.setItem("uv_selectedEventMode", ev.mode || "single-day");
          localStorage.setItem("uv_selectedEventDays", String(ev.days || 1));
          localStorage.setItem("uv_dayNumber", "1");
        }
      }

    } catch (e) {
      toast.error("Failed to load your assigned events.");
    }
  }

  // Effect to load stock when selectedEventName changes
  useEffect(() => {
    if (selectedEventName && dayNumber) {
      loadEventStock();
    }
  }, [selectedEventName, dayNumber]);

  /* 🔹 Load event stock */
  const loadEventStock = async () => {
    if (!selectedEventName) return;
    try {
      const res = await apiGet(
        `/events/stock/user?event_name=${encodeURIComponent(selectedEventName)}&user_id=${currentUser.id}`
      );
      setItems(res.items || []);
    } catch (err: any) {
      if (err.response?.status === 403) {
        toast.error("You are not assigned to this event or no longer have access.");
        setSelectedEventName("");
        setSelectedEventId("");
        localStorage.removeItem("uv_selectedEventId");
        localStorage.removeItem("uv_selectedEventName");
      } else {
        toast.error("Unable to load event stock. Ensure you have products packed for this event.");
      }
    }
  };

  useEffect(() => {
    if (selectedEventName) loadEventStock();
  }, [selectedEventName]);

  /* 🔹 Add to cart */
  const addToCart = () => {
    if (!sellName) return toast.error("Please enter a product name");

    let matchedProducts = items.filter(p => p.name.toLowerCase() === sellName.toLowerCase());
    if (matchedProducts.length === 0) {
      matchedProducts = items.filter(p => p.name.toLowerCase().includes(sellName.toLowerCase()));
    }

    if (matchedProducts.length === 0) return toast.error("Item not found in this event's inventory");

    /* 🔹 Confirm & Handle Ambiguity */
    const confirmAndAdd = (productName: string) => {
      const item = items.find(i => i.name === productName);
      if (!item) return;

      const qty = sellQty ? Number(sellQty) : 1;
      if (qty > item.quantity_remaining) {
        toast.error("Insufficient stock remaining");
        setConfirmOpen(false);
        return;
      }

      setCart([
        ...cart,
        {
          name: item.name,
          category: item.category,
          rate: sellRate ? Number(sellRate) : item.rate,
          quantity: qty,
          is_gift: isGift
        },
      ]);

      setSellName("");
      setSellQty("");
      setSellRate("");
      setIsGift(false);
      setConfirmOpen(false);

      // Play sound effects based on stock
      if (item.quantity_remaining <= 5) {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio play blocked", e));
        toast.warning(`${item.name} added (LOW STOCK)`);
      } else {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3");
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio play blocked", e));
        toast.success(`${item.name} added`);
      }
    };

    if (matchedProducts.length > 1) {
      setConfirmOptions(matchedProducts.map(p => ({
        name: p.name,
        rate: p.rate,
        stock: p.quantity_remaining
      })));
      setConfirmOpen(true);
      return;
    }

    const item = matchedProducts[0];
    const qty = sellQty ? Number(sellQty) : 1;

    if (qty <= 0) return toast.error("Invalid quantity");
    if (qty > item.quantity_remaining)
      return toast.error("Insufficient stock remaining");

    confirmAndAdd(item.name);
  };

  /* 🔹 Multi-item logic (for AI speech) */
  const handleAddItems = (scannedItems: { name: string; quantity: number }[]) => {
    let addedCount = 0;
    scannedItems.forEach(scanned => {
      let matchedProducts = items.filter(p => p.name.toLowerCase() === scanned.name.toLowerCase());
      if (matchedProducts.length === 0) {
        matchedProducts = items.filter(p => p.name.toLowerCase().includes(scanned.name.toLowerCase()));
      }
      if (matchedProducts.length === 1) {
        const item = matchedProducts[0];
        if (scanned.quantity <= item.quantity_remaining) {
          setCart(prev => [...prev, {
            name: item.name,
            category: item.category,
            rate: item.rate,
            quantity: scanned.quantity,
            is_gift: false
          }]);

          if (item.quantity_remaining <= 5) {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Audio play blocked", e));
            toast.warning(`${item.name} added (LOW STOCK)`);
          } else {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3");
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Audio play blocked", e));
            toast.success(`${item.name} added via AI`);
          }
          addedCount++;
        } else {
          toast.error(`Insufficient stock for ${scanned.name}`);
        }
      } else if (matchedProducts.length > 1) {
        toast.error(`Multiple matches for ${scanned.name}, be more specific`);
      } else {
        toast.error(`Item ${scanned.name} not found in this event`);
      }
    });

    if (addedCount > 0) {
      setSellName("");
      setSellQty("");
    }
  };

  const handleRemoveItems = (itemsToRemove: { name: string; quantity: number }[]) => {
    setCart(prevCart => {
      let updatedCart = [...prevCart];
      itemsToRemove.forEach(scanned => {
        const indexToRemove = updatedCart.findIndex(
          cartItem => cartItem.name.toLowerCase() === scanned.name.toLowerCase() ||
            cartItem.name.toLowerCase().includes(scanned.name.toLowerCase())
        );

        if (indexToRemove !== -1) {
          updatedCart.splice(indexToRemove, 1);
        }
      });

      if (updatedCart.length < prevCart.length) {
        toast.success(`Removed items`);
        return updatedCart;
      } else {
        toast.error("Item not found in cart");
        return prevCart;
      }
    });
  };

  /* 🔹 Confirm sale */
  const confirmSale = async () => {
    if (!cart.length) return toast.error("Cart empty");

    try {
      await apiPost("/events/sell", {
        event_name: selectedEventName,
        user_id: currentUser.id,
        day_number: parseInt(dayNumber, 10) || 1,
        payment_mode: paymentMode,
        items: cart,
      });

      // Play success sound on sale completion
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3");
      audio.volume = 0.6;
      audio.play().catch(e => console.log("Audio play blocked", e));

      toast.success("Sale completed successfully!");
      setCart([]);
      loadEventStock();
      if (posTab === "history") loadSalesHistory();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Sale transaction failed");
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.is_gift ? 0 : item.rate * item.quantity), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">

      {/* HEADER SECTION (GLASSMORPHIC) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900/80 via-teal-900/80 to-slate-900/80 p-6 md:p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Store className="h-8 w-8 text-emerald-400" />
              <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-white tracking-tight">
                User Vault
              </h1>
            </div>
            <p className="text-emerald-200/80 text-lg max-w-xl">
              Point of Sale interface for live events and locations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
            <div className="w-full sm:w-64">
              <Select
                value={selectedEventId}
                onValueChange={(val) => {
                  const ev = assignedEvents.find((e) => e.id.toString() === val);
                  if (ev) {
                    setSelectedEventId(val);
                    setSelectedEventName(ev.name);
                    setSelectedEventMode(ev.mode || "single-day");
                    setSelectedEventDays(ev.days || 1);
                    setDayNumber("1");

                    localStorage.setItem("uv_selectedEventId", val);
                    localStorage.setItem("uv_selectedEventName", ev.name);
                    localStorage.setItem("uv_selectedEventMode", ev.mode || "single-day");
                    localStorage.setItem("uv_selectedEventDays", String(ev.days || 1));
                    localStorage.setItem("uv_dayNumber", "1");
                  }
                }}
                disabled={dayStarted}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white h-12 rounded-xl focus:ring-emerald-500">
                  <SelectValue placeholder="Select Assigned Event" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 text-white">
                  {assignedEvents.length === 0 ? (
                    <SelectItem value="none" disabled>No active events found</SelectItem>
                  ) : (
                    assignedEvents.map(e => (
                      <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedEventMode === "multi-day" && !dayStarted && (
              <div className="w-full sm:w-32">
                <Select
                  value={dayNumber}
                  onValueChange={(val) => {
                    setDayNumber(val);
                    localStorage.setItem("uv_dayNumber", val);
                  }}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white h-12 rounded-xl focus:ring-emerald-500">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10 text-white">
                    {Array.from({ length: selectedEventDays }).map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>Day {i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!dayStarted ? (
              <Button
                onClick={() => {
                  setDayStarted(true);
                  localStorage.setItem("uv_dayStarted", "true");
                }}
                disabled={!selectedEventId}
                className="w-full sm:w-auto h-12 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/30 transition-all font-bold"
              >
                <Play className="h-5 w-5 mr-2" /> Start Day {selectedEventMode === "multi-day" ? dayNumber : ""}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => {
                  setDayStarted(false);
                  localStorage.removeItem("uv_dayStarted");
                  setCart([]);
                }}
                className="w-full sm:w-auto h-12 px-6 rounded-xl shadow-lg border-0 bg-rose-600 hover:bg-rose-500 font-bold"
              >
                <Square className="h-5 w-5 mr-2" /> End Day
              </Button>
            )}
          </div>
        </div>
      </div>

      {!selectedEventId ? (
        <Card className="border-0 bg-slate-900/50 backdrop-blur-md rounded-3xl h-64 flex flex-col items-center justify-center border-dashed border-2 border-white/10">
          <Store className="h-16 w-16 text-slate-600 mb-4" />
          <p className="text-xl text-slate-400 font-bold">Select an assigned event to view inventory.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* AVAILABLE ITEMS LIST (Left Column) */}
          <Card className="lg:col-span-7 xl:col-span-8 bg-slate-900/90 border-white/10 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden flex flex-col h-[700px]">
            <CardHeader className="border-b border-white/10 bg-white/5 pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl font-bold flex items-center gap-2 text-white">
                  <Package className="text-emerald-400" /> Event Inventory
                </CardTitle>
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-sm px-3 py-1">
                  {items.length} unique items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-5">
                {items.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 italic">No inventory loaded for this event yet.</div>
                ) : (
                  <>
                    {/* Regular Items */}
                    {items.filter(i => !i.is_gift).length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3">Regular Items</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {items.filter(i => !i.is_gift).map((i, idx) => (
                            <div
                              key={idx}
                              className="group flex flex-col p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-emerald-500/50 transition-all cursor-pointer shadow-sm relative overflow-hidden"
                              onClick={() => {
                                setSellName(i.name);
                                setSellRate(i.rate.toString());
                                setSellQty("1");
                              }}
                            >
                              {i.quantity_remaining <= 5 && (
                                <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/20 rounded-bl-full -z-10 blur-md"></div>
                              )}
                              <div className="flex justify-between items-start mb-2">
                                <p className="font-bold text-white text-lg truncate pr-2" title={i.name}>{i.name}</p>
                                <Badge className={`${i.quantity_remaining <= 5 ? 'bg-rose-500 text-white' : 'bg-white/10 text-slate-300'} border-0`}>
                                  Qty: {i.quantity_remaining}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-end mt-auto pt-2">
                                <Badge variant="outline" className="text-xs text-emerald-200 border-emerald-500/30 bg-emerald-500/10 uppercase tracking-wider">
                                  {i.category}
                                </Badge>
                                <p className="text-xl font-bold text-emerald-400">₹{i.rate}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gift Items */}
                    {items.filter(i => i.is_gift).length > 0 && (
                      <div>
                        <p className="text-xs text-rose-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-1">
                          <Gift className="w-3 h-3" /> Event Gift Pack — Click to Distribute
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {items.filter(i => i.is_gift).map((i, idx) => (
                            <div
                              key={idx}
                              className="group flex flex-col p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl hover:bg-rose-500/10 hover:border-rose-500/50 transition-all cursor-pointer shadow-sm relative overflow-hidden"
                              onClick={() => {
                                // Auto-add gift item to cart immediately at ₹0
                                if (i.quantity_remaining <= 0) {
                                  toast.error("No gift stock remaining");
                                  return;
                                }
                                setCart(prev => [...prev, {
                                  name: i.name,
                                  category: i.category,
                                  rate: 0,
                                  quantity: 1,
                                  is_gift: true
                                }]);
                                toast.success(`🎁 ${i.name} added as Gift`);
                              }}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <p className="font-bold text-white text-lg truncate pr-2 flex items-center gap-1" title={i.name}>
                                  🎁 {i.name}
                                </p>
                                <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  Qty: {i.quantity_remaining}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-end mt-auto pt-2">
                                <Badge variant="outline" className="text-xs text-rose-200 border-rose-500/30 bg-rose-500/10 uppercase tracking-wider">
                                  {i.category}
                                </Badge>
                                <p className="text-sm font-bold text-rose-400">FREE Gift</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* POINT OF SALE PANEL (Right Column) */}
          <Card className="lg:col-span-5 xl:col-span-4 bg-slate-900/90 border-white/10 backdrop-blur-xl rounded-3xl shadow-xl flex flex-col h-[calc(100vh-100px)] min-h-[500px] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>

            <CardHeader className="border-b border-white/10 bg-white/5 pb-4">
              <CardTitle className="text-2xl font-bold flex items-center gap-2 text-white">
                <ShoppingCart className="text-teal-400 h-6 w-6" /> Point of Sale
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col relative">

              {!dayStarted && (
                <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-b-3xl">
                  <Play className="h-12 w-12 text-emerald-400/50 mb-4" />
                  <p className="text-lg text-white font-bold tracking-tight">Day Not Started</p>
                  <p className="text-slate-400 text-sm mt-1">Please click Start Day above to begin transactions.</p>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b border-white/10">
                <button
                  className={`flex-1 py-3 font-bold text-sm transition-colors ${posTab === "cart" ? "bg-white/10 text-emerald-400" : "text-slate-400 hover:bg-white/5"}`}
                  onClick={() => setPosTab("cart")}
                >
                  Current Cart
                </button>
                <button
                  className={`flex-1 py-3 font-bold text-sm transition-colors ${posTab === "history" ? "bg-white/10 text-emerald-400" : "text-slate-400 hover:bg-white/5"}`}
                  onClick={() => setPosTab("history")}
                >
                  My Sales
                </button>
              </div>

          {/* EVENT ALERTS BANNER */}
          {dayStarted && eventAlerts.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mt-6">
              <h3 className="text-red-400 font-bold flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5" /> Event Alerts ({eventAlerts.length})
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                {eventAlerts.map(alert => (
                  <div key={alert.id} className="flex gap-2 items-start text-sm">
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${alert.severity === 'critical' ? 'text-red-400' : 'text-orange-400'}`} />
                    <div>
                      <p className={`font-semibold ${alert.severity === 'critical' ? 'text-red-300' : 'text-orange-300'}`}>{alert.title}</p>
                      <p className="text-slate-300 text-xs">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {posTab === "cart" ? (
                <>
                  {/* Input Section */}
                  <div className="p-4 space-y-4 bg-black/20">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Item name..."
                          className="pl-9 bg-white/5 border-white/10 text-white h-10 focus:border-emerald-500"
                          value={sellName}
                          onChange={(e) => setSellName(e.target.value)}
                        />
                      </div>
                      <Input
                        type="number"
                        placeholder="Rate"
                        className="w-20 bg-white/5 border-white/10 text-emerald-300 h-10 font-bold flex-none focus:border-emerald-500 text-center"
                        value={sellRate}
                        onChange={(e) => setSellRate(e.target.value)}
                        title="Override Rate (Optional)"
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        className="w-20 bg-white/5 border-white/10 text-white h-10 font-bold flex-none focus:border-emerald-500 text-center"
                        value={sellQty}
                        onChange={(e) => setSellQty(e.target.value)}
                      />
                    </div>

                    {/* Automation Tools */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <AISpeech
                          context="event_sell"
                          eventName={selectedEventName}
                          userId={currentUser.id}
                          onFill={(data: any) => {
                            if (data?.name) {
                              handleAddItems([{ name: data.name, quantity: data.quantity || 1 }]);
                            }
                          }}
                          onAddItems={handleAddItems}
                          onRemoveItems={handleRemoveItems}
                          onAmbiguity={(ambiguities) => { if (ambiguities.length > 0) { setConfirmOptions(ambiguities[0].options); setConfirmOpen(true); } }}
                          onSuccess={loadEventStock}
                        />
                      </div>

                      <div className="flex-1 h-10 flex border border-white/10 rounded-md bg-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                        <CameraScan
                          context="event_sell"
                          eventName={selectedEventName}
                          onAutoMatch={(product) => {
                            handleAddItems([{ name: product.name, quantity: 1 }]);
                          }}
                          onConfirmMatch={(options) => {
                            setConfirmOptions(options);
                            setConfirmOpen(true);
                          }}
                        />
                      </div>
                      
                      <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-white/10 px-3 rounded-md hover:bg-white/10 transition-colors">
                        <input type="checkbox" className="w-4 h-4 accent-emerald-500" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} />
                        <span className="text-white text-sm font-bold">🎁 Gift</span>
                      </label>

                      <Button onClick={addToCart} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg h-10 px-6 font-bold flex-none">
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Cart Items Area */}
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                    {cart.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                        <ShoppingCart className="h-12 w-12 mb-2" />
                        <p>Cart is empty</p>
                      </div>
                    ) : (
                      cart.map((c, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/5 border border-white/10 p-3 rounded-xl hover:bg-white/10 transition-colors">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-bold text-white truncate text-sm">{c.name} {c.is_gift && <Badge className="ml-2 bg-purple-500/20 text-purple-300 border-0">🎁 Gift</Badge>}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-400">Qty:</span>
                              <input
                                type="number"
                                className="w-16 bg-black/30 border border-white/10 rounded px-1 text-xs text-white text-center h-6 focus:outline-none focus:border-emerald-500"
                                value={c.quantity}
                                min="1"
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val > 0) {
                                    const newCart = [...cart];
                                    newCart[i].quantity = val;
                                    setCart(newCart);
                                  }
                                }}
                              />
                              <span className="text-xs text-slate-400">× ₹{c.rate}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-bold ${c.is_gift ? 'text-slate-500 line-through' : 'text-emerald-400'}`}>₹{c.quantity * c.rate}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-rose-400 hover:text-white hover:bg-rose-500/80 rounded"
                              onClick={() => setCart(cart.filter((_, idx) => idx !== i))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Checkout Footer */}
                  <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md mt-auto">
                    <div className="flex justify-between items-end mb-4">
                      <div className="space-y-1 w-1/2">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Payment Method</p>
                        <Select value={paymentMode} onValueChange={setPaymentMode}>
                          <SelectTrigger className="bg-white/10 border-white/10 text-white h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-white/10 text-white">
                            <SelectItem value="cash"><div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-emerald-400" /> Cash</div></SelectItem>
                            <SelectItem value="online"><div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-blue-400" /> Online/UPI</div></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="text-right pl-2">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Total Due</p>
                        <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                          ₹{cartTotal.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <Button
                      className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-lg font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] border-0"
                      onClick={confirmSale}
                      disabled={cart.length === 0}
                    >
                      <Check className="h-5 w-5 mr-2" /> Complete Transaction
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                  {salesHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                      <Store className="h-12 w-12 mb-2" />
                      <p>No sales recorded yet.</p>
                      <Button variant="outline" className="mt-4 border-white/10 text-white hover:bg-white/10" onClick={loadSalesHistory}>Refresh</Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-2 px-1">
                         <span className="text-slate-400 text-xs font-bold uppercase">Recent Transactions</span>
                         <Button variant="ghost" size="sm" onClick={loadSalesHistory} className="h-6 text-xs text-emerald-400 hover:bg-emerald-500/20 px-2 py-0">Refresh</Button>
                      </div>
                      {salesHistory.map((s: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-white/5 border border-white/10 p-3 rounded-xl hover:bg-white/10 transition-colors group">
                          <div>
                            <p className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">{s.product_name}</p>
                            <p className="text-xs text-slate-400 space-x-2">
                              <span>{new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-slate-600">|</span>
                              <span>Qty: {s.quantity}</span>
                            </p>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <p className="font-bold text-emerald-400">₹{s.total_price}</p>
                            <Badge className={`mt-1 text-[9px] uppercase px-1 py-0 ${s.payment_mode === "cash" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-blue-500/20 text-blue-300 border-blue-500/30"}`}>{s.payment_mode}</Badge>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Dialog for Matches/Ambiguity */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-slate-900 border border-white/20 text-white sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Search className="text-teal-400 h-5 w-5" /> Select Specific Item
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {confirmOptions.map((opt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border border-white/10 bg-white/5 p-4 rounded-xl hover:bg-white/10 hover:border-teal-500/50 cursor-pointer transition-all"
                onClick={() => {
                  handleAddItems([{ name: opt.name, quantity: opt.quantity || (sellQty ? Number(sellQty) : 1) }]);
                  setConfirmOpen(false);
                }}
              >
                <div>
                  <p className="font-bold text-lg">{opt.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{opt.confidence ? `Match: ${Math.round(opt.confidence * 100)}%` : `Qty Avail: ${opt.stock}`}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-xl text-emerald-400">₹{opt.rate}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Select ➔</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
      `}</style>
    </div>
  );
}
