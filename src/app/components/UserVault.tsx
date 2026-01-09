import { useState } from "react";
import { AppState, SaleRecord } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { 
  ShoppingCart, 
  AlertCircle, 
  Package, 
  Play, 
  Square, 
  Mic, 
  Camera, 
  Check, 
  X,
  Download,
  Wallet,
  CreditCard
} from "lucide-react";

interface UserVaultProps {
  appState: AppState;
  setAppState: (state: AppState) => void;
}

interface SaleItem {
  itemIndex: number;
  itemName: string;
  quantity: number;
  rate: number;
  area: string;
}

export default function UserVault({ appState, setAppState }: UserVaultProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [dayStarted, setDayStarted] = useState(false);
  const [isDaySummaryOpen, setIsDaySummaryOpen] = useState(false);
  
  // Selling state
  const [sellItemName, setSellItemName] = useState("");
  const [sellQuantity, setSellQuantity] = useState("");
  const [sellRate, setSellRate] = useState("");
  const [tempSalesList, setTempSalesList] = useState<SaleItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Online">("Cash");
  const [buyerName, setBuyerName] = useState("");

  // Day summary data
  const [daySummary, setDaySummary] = useState<{
    itemSales: { itemName: string; quantity: number; amount: number }[];
    totalCash: number;
    totalOnline: number;
    grandTotal: number;
  } | null>(null);

  const user = appState.currentUser!;
  const activeEvents = appState.events.filter((e) => e.status === "Active");
  const selectedEvent = activeEvents.find((e) => e.id === selectedEventId);

  // Filter items by user's assigned areas
  const userItems = selectedEvent
    ? selectedEvent.items.filter((item) =>
        user.role === "Admin" || user.assignedAreas.includes("All") || user.assignedAreas.includes(item.area)
      )
    : [];

  const getAvailableQuantity = (itemIndex: number) => {
    if (!selectedEvent) return 0;
    
    const eventItem = selectedEvent.items[itemIndex];
    const currentDay = selectedEvent.currentDay || 1;

    if (eventItem.dailyTracking && eventItem.dailyTracking.length > 0) {
      const todayTracking = eventItem.dailyTracking.find((t) => t.day === currentDay);
      return todayTracking ? todayTracking.endQuantity : 0;
    }

    const itemSales = appState.sales.filter(
      (s) => s.eventId === selectedEvent.id && s.itemId === eventItem.itemId
    );
    const totalSold = itemSales.reduce((sum, s) => sum + s.quantity, 0);
    return eventItem.initialQuantity - totalSold;
  };

  const handleStartDay = () => {
    if (!selectedEvent) {
      toast.error("Please select an event first");
      return;
    }
    setDayStarted(true);
    toast.success("Day started - Begin selling!");
  };

  const handleAddToSellList = () => {
    if (!selectedEvent) return;

    const itemIndex = selectedEvent.items.findIndex(
      (i) => i.itemName.toLowerCase() === sellItemName.toLowerCase()
    );

    if (itemIndex === -1) {
      toast.error("Item not found in event");
      return;
    }

    const item = selectedEvent.items[itemIndex];
    const available = getAvailableQuantity(itemIndex);
    const qty = parseInt(sellQuantity);
    const rate = parseFloat(sellRate) || item.rate;

    if (!qty || qty <= 0) {
      toast.error("Please enter valid quantity");
      return;
    }

    if (qty > available) {
      toast.error(`Only ${available} units available`);
      return;
    }

    const saleItem: SaleItem = {
      itemIndex,
      itemName: item.itemName,
      quantity: qty,
      rate: rate,
      area: item.area,
    };

    setTempSalesList([...tempSalesList, saleItem]);
    setSellItemName("");
    setSellQuantity("");
    setSellRate("");
    toast.success("Item added to sale list");
  };

  const handleRemoveFromSellList = (index: number) => {
    setTempSalesList(tempSalesList.filter((_, i) => i !== index));
  };

  const handleConfirmSales = () => {
    if (!selectedEvent || tempSalesList.length === 0) {
      toast.error("No items in sale list");
      return;
    }

    const currentDay = selectedEvent.currentDay || 1;
    const newSales: SaleRecord[] = tempSalesList.map((item) => {
      const eventItem = selectedEvent.items[item.itemIndex];
      return {
        id: `sale-${Date.now()}-${Math.random()}`,
        itemId: eventItem.itemId,
        itemName: item.itemName,
        quantity: item.quantity,
        rate: item.rate,
        area: item.area,
        soldBy: user.name,
        soldTo: buyerName || undefined,
        timestamp: new Date().toISOString(),
        eventId: selectedEvent.id,
        eventDay: currentDay,
      };
    });

    // Update event tracking
    const updatedEvents = appState.events.map((event) => {
      if (event.id === selectedEvent.id) {
        const updatedItems = event.items.map((item, idx) => {
          const soldItem = tempSalesList.find((s) => s.itemIndex === idx);
          if (soldItem) {
            const updatedItem = { ...item };
            if (updatedItem.dailyTracking && updatedItem.dailyTracking.length > 0) {
              updatedItem.dailyTracking = updatedItem.dailyTracking.map((t) => {
                if (t.day === currentDay) {
                  return {
                    ...t,
                    sold: t.sold + soldItem.quantity,
                    endQuantity: t.endQuantity - soldItem.quantity,
                    sales: [...t.sales, ...newSales.filter((s) => s.itemId === item.itemId)],
                  };
                }
                return t;
              });
            }
            return updatedItem;
          }
          return item;
        });
        return { ...event, items: updatedItems };
      }
      return event;
    });

    setAppState({
      ...appState,
      events: updatedEvents,
      sales: [...appState.sales, ...newSales],
    });

    const totalAmount = tempSalesList.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    toast.success(`Sale completed! Total: ₹${totalAmount.toFixed(2)} (${paymentMode})`, {
      icon: "🎉",
    });
    
    setTempSalesList([]);
    setBuyerName("");
  };

  const handleStopDay = () => {
    if (!selectedEvent) return;

    // Calculate day summary
    const currentDay = selectedEvent.currentDay || 1;
    const todaySales = appState.sales.filter(
      (s) => s.eventId === selectedEvent.id && s.eventDay === currentDay && s.soldBy === user.name
    );

    // Group by item
    const itemSalesMap = new Map<string, { quantity: number; amount: number }>();
    todaySales.forEach((sale) => {
      const existing = itemSalesMap.get(sale.itemName) || { quantity: 0, amount: 0 };
      itemSalesMap.set(sale.itemName, {
        quantity: existing.quantity + sale.quantity,
        amount: existing.amount + sale.quantity * sale.rate,
      });
    });

    const itemSales = Array.from(itemSalesMap.entries()).map(([itemName, data]) => ({
      itemName,
      quantity: data.quantity,
      amount: data.amount,
    }));

    const grandTotal = todaySales.reduce((sum, s) => sum + s.quantity * s.rate, 0);
    const totalCash = grandTotal * 0.6; // Mock
    const totalOnline = grandTotal * 0.4; // Mock

    setDaySummary({
      itemSales,
      totalCash,
      totalOnline,
      grandTotal,
    });

    setDayStarted(false);
    setTempSalesList([]);
    setIsDaySummaryOpen(true);
    toast.success("Day stopped - Summary generated");
  };

  const handleVoiceInput = () => {
    toast.info("Voice input feature - Coming soon");
  };

  const handleCameraInput = () => {
    toast.info("Camera recognition feature - Coming soon");
  };

  const totalSalesValue = tempSalesList.reduce((sum, item) => sum + item.quantity * item.rate, 0);

  // If no event selected, show event selection
  if (!selectedEventId || !selectedEvent) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Vault</h1>
          <p className="text-gray-500 mt-1">Sell items during events</p>
        </div>

        {/* Event Selection */}
        {activeEvents.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Select Active Event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an event to start selling" />
                </SelectTrigger>
                <SelectContent>
                  {activeEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                      {event.mode === "multi-day" && ` (Day ${event.currentDay || 1} of ${event.days})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEventId && (
                <Button className="w-full" onClick={() => {}}>
                  Continue to Selling
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-orange-500" />
                <p className="text-lg font-medium text-gray-900 mb-2">No Active Events</p>
                <p className="text-sm">Events must be started by an admin before selling</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Main Selling Interface (Split Panel)
  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{selectedEvent.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge className="bg-indigo-600">
                {selectedEvent.mode === "multi-day"
                  ? `Day ${selectedEvent.currentDay || 1} of ${selectedEvent.days}`
                  : "Single Day"}
              </Badge>
              <Badge variant="outline">{user.assignedAreas.join(", ")}</Badge>
              {dayStarted && (
                <Badge className="bg-green-600">Day Active</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!dayStarted ? (
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleStartDay}
              >
                <Play className="h-5 w-5 mr-2" />
                Start Day
              </Button>
            ) : (
              <Button
                size="lg"
                variant="destructive"
                onClick={handleStopDay}
              >
                <Square className="h-5 w-5 mr-2" />
                Stop Day
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setSelectedEventId("")}
            >
              Change Event
            </Button>
          </div>
        </div>
      </div>

      {!dayStarted ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Play className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Day Not Started</h3>
              <p className="text-gray-600 mb-6">
                Click "Start Day" to begin selling for this event
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT PANEL: Item List (Assigned Area Only) */}
          <Card className="lg:h-[calc(100vh-300px)]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Available Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-400px)]">
                {userItems.length > 0 ? (
                  userItems.map((item, index) => {
                    const originalIndex = selectedEvent.items.findIndex(
                      (i) => i.itemId === item.itemId && i.addedAt === item.addedAt
                    );
                    const available = getAvailableQuantity(originalIndex);
                    const isLowStock = available < 10;

                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          available === 0
                            ? "bg-red-50 border-red-300"
                            : isLowStock
                            ? "bg-orange-50 border-orange-300"
                            : "bg-gray-50 border-gray-200 hover:border-indigo-300"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{item.itemName}</h4>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {item.area}
                            </Badge>
                          </div>
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600">Remaining</p>
                            <p
                              className={`text-2xl font-bold ${
                                available === 0
                                  ? "text-red-600"
                                  : isLowStock
                                  ? "text-orange-600"
                                  : "text-green-600"
                              }`}
                            >
                              {available}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600">Rate</p>
                            <p className="text-lg font-semibold text-gray-900">₹{item.rate}</p>
                          </div>
                        </div>
                        {available === 0 && (
                          <div className="mt-2 flex items-center text-xs text-red-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Out of stock
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No items in your assigned area</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* RIGHT PANEL: Selling Panel */}
          <Card className="lg:h-[calc(100vh-300px)]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Selling Panel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Manual Input */}
                <div>
                  <Label>Item Name</Label>
                  <Input
                    value={sellItemName}
                    onChange={(e) => setSellItemName(e.target.value)}
                    placeholder="Enter item name"
                    list="event-items"
                  />
                  <datalist id="event-items">
                    {userItems.map((item) => (
                      <option key={item.itemId} value={item.itemName} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={sellQuantity}
                      onChange={(e) => setSellQuantity(e.target.value)}
                      placeholder="Qty"
                    />
                  </div>
                  <div>
                    <Label>Rate (₹)</Label>
                    <Input
                      type="number"
                      value={sellRate}
                      onChange={(e) => setSellRate(e.target.value)}
                      placeholder="Rate"
                    />
                  </div>
                </div>

                {/* Voice and Camera Input */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleVoiceInput}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Voice
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleCameraInput}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Camera
                  </Button>
                </div>

                <Button onClick={handleAddToSellList} className="w-full">
                  Add to List
                </Button>

                {/* Live Selling List */}
                <div className="border-t pt-4">
                  <Label className="mb-2 block">Sale List</Label>
                  {tempSalesList.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <p className="text-sm">No items added</p>
                    </div>
                  ) : (
                    <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                      {tempSalesList.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.itemName}</p>
                            <p className="text-xs text-gray-600">
                              {item.quantity} × ₹{item.rate} = ₹{item.quantity * item.rate}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleRemoveFromSellList(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment Mode */}
                <div>
                  <Label>Payment Mode</Label>
                  <Select
                    value={paymentMode}
                    onValueChange={(value: "Cash" | "Online") => setPaymentMode(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">
                        <div className="flex items-center">
                          <Wallet className="h-4 w-4 mr-2" />
                          Cash
                        </div>
                      </SelectItem>
                      <SelectItem value="Online">
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Online
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Buyer Name */}
                <div>
                  <Label>Buyer Name (Optional)</Label>
                  <Input
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Enter buyer name"
                  />
                </div>

                {/* Total and Confirm */}
                {tempSalesList.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-2xl font-bold text-indigo-600">
                        ₹{totalSalesValue.toFixed(2)}
                      </span>
                    </div>
                    <Button
                      onClick={handleConfirmSales}
                      className="w-full bg-green-600 hover:bg-green-700 h-12"
                    >
                      <Check className="h-5 w-5 mr-2" />
                      Confirm Sale
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Day Summary Dialog */}
      <Dialog open={isDaySummaryOpen} onOpenChange={setIsDaySummaryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Day Summary</DialogTitle>
          </DialogHeader>
          {daySummary && (
            <div className="space-y-6">
              {/* Item-wise Totals */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Item-wise Sales</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                          Item
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">
                          Qty
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {daySummary.itemSales.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm">{item.itemName}</td>
                          <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm font-medium text-right">
                            ₹{item.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-2">
                      <Wallet className="h-5 w-5 mr-2 text-green-600" />
                      <p className="text-sm text-gray-600">Cash</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{daySummary.totalCash.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-2">
                      <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                      <p className="text-sm text-gray-600">Online</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      ₹{daySummary.totalOnline.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Grand Total */}
              <div className="p-6 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">Grand Total</span>
                  <span className="text-3xl font-bold text-indigo-600">
                    ₹{daySummary.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Download Button */}
              <Button className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Summary
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
