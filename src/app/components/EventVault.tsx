import { useState } from "react";
import { AppState, Event, EventItem } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { 
  Plus, 
  Calendar, 
  Play, 
  Pause, 
  CheckCircle, 
  Package,
  ArrowLeft,
  TrendingUp,
  Clock,
  User as UserIcon
} from "lucide-react";

interface EventVaultProps {
  appState: AppState;
  setAppState: (state: AppState) => void;
}

export default function EventVault({ appState, setAppState }: EventVaultProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPackDialogOpen, setIsPackDialogOpen] = useState(false);
  const [openedEvent, setOpenedEvent] = useState<Event | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [newEvent, setNewEvent] = useState({
    name: "",
    type: "Sunday",
    mode: "single-day" as "single-day" | "multi-day",
    days: 1,
    startDate: new Date().toISOString().split("T")[0],
  });

  const [packData, setPackData] = useState({
    itemId: "",
    quantity: 0,
  });

  const isAdmin = appState.currentUser?.role === "Admin";

  const handleCreateEvent = () => {
    if (!newEvent.name || !newEvent.startDate) {
      toast.error("Please fill all required fields");
      return;
    }

    const event: Event = {
      id: `event-${Date.now()}`,
      name: newEvent.name,
      type: newEvent.type,
      mode: newEvent.mode,
      days: newEvent.mode === "multi-day" ? newEvent.days : 1,
      startDate: newEvent.startDate,
      endDate: newEvent.mode === "multi-day" 
        ? new Date(new Date(newEvent.startDate).getTime() + (newEvent.days - 1) * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        : newEvent.startDate,
      status: "Planned",
      createdBy: appState.currentUser!.name,
      createdAt: new Date().toISOString(),
      items: [],
      currentDay: 1,
    };

    setAppState({
      ...appState,
      events: [...appState.events, event],
    });

    toast.success(`Event "${event.name}" created successfully`);
    setNewEvent({
      name: "",
      type: "Sunday",
      mode: "single-day",
      days: 1,
      startDate: new Date().toISOString().split("T")[0],
    });
    setIsCreateDialogOpen(false);
  };

  const handlePackItem = () => {
    if (!openedEvent || !packData.itemId || packData.quantity <= 0) {
      toast.error("Please select an item and enter valid quantity");
      return;
    }

    const item = appState.inventory.find((i) => i.id === packData.itemId);
    if (!item) {
      toast.error("Item not found");
      return;
    }

    if (item.quantity < packData.quantity) {
      toast.error("Insufficient quantity in Main Vault");
      return;
    }

    const eventItem: EventItem = {
      itemId: item.id,
      itemName: item.name,
      area: item.area,
      rate: item.rate,
      initialQuantity: packData.quantity,
      addedBy: appState.currentUser!.name,
      addedAt: new Date().toISOString(),
      dailyTracking: [],
    };

    // Initialize daily tracking for multi-day events
    if (openedEvent.mode === "multi-day") {
      const tracking = [];
      for (let day = 1; day <= (openedEvent.days || 1); day++) {
        const dayDate = new Date(openedEvent.startDate);
        dayDate.setDate(dayDate.getDate() + (day - 1));
        tracking.push({
          day,
          date: dayDate.toISOString().split("T")[0],
          startQuantity: day === 1 ? packData.quantity : 0,
          sold: 0,
          endQuantity: day === 1 ? packData.quantity : 0,
          sales: [],
        });
      }
      eventItem.dailyTracking = tracking;
    }

    // Update inventory
    const updatedInventory = appState.inventory.map((i) =>
      i.id === item.id
        ? { ...i, quantity: i.quantity - packData.quantity }
        : i
    );

    // Update event
    const updatedEvents = appState.events.map((e) =>
      e.id === openedEvent.id
        ? { ...e, items: [...e.items, eventItem] }
        : e
    );

    setAppState({
      ...appState,
      inventory: updatedInventory,
      events: updatedEvents,
    });

    toast.success(`Packed ${packData.quantity} ${item.name} for ${openedEvent.name}`);
    setPackData({ itemId: "", quantity: 0 });
    setOpenedEvent(updatedEvents.find((e) => e.id === openedEvent.id) || null);
    setIsPackDialogOpen(false);
  };

  const handleStatusChange = (newStatus: Event["status"]) => {
    if (!openedEvent) return;

    const updatedEvents = appState.events.map((e) =>
      e.id === openedEvent.id ? { ...e, status: newStatus } : e
    );

    setAppState({
      ...appState,
      events: updatedEvents,
    });

    setOpenedEvent(updatedEvents.find((e) => e.id === openedEvent.id) || null);
    toast.success(`Event ${newStatus.toLowerCase()}`);
  };

  // Event List View
  if (!openedEvent) {
    const activeEvents = appState.events.filter((e) => e.status === "Active");
    const plannedEvents = appState.events.filter((e) => e.status === "Planned");
    const pausedEvents = appState.events.filter((e) => e.status === "Paused");
    const completedEvents = appState.events.filter((e) => e.status === "Completed");

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Event Vault</h1>
            <p className="text-gray-500 mt-1">Manage events and track inventory</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeEvents.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Planned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{plannedEvents.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Paused</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pausedEvents.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedEvents.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Event List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">All Events</h2>
          {appState.events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {appState.events.map((event) => (
                <Card key={event.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{event.name}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge
                            className={
                              event.status === "Active"
                                ? "bg-green-600"
                                : event.status === "Planned"
                                ? "bg-blue-600"
                                : event.status === "Paused"
                                ? "bg-orange-500"
                                : "bg-gray-600"
                            }
                          >
                            {event.status === "Planned" ? "Packing" : event.status}
                          </Badge>
                          <Badge variant="outline">
                            {event.mode === "multi-day" ? "Multi-day" : "Single-day"}
                          </Badge>
                        </div>
                      </div>
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">
                          {new Date(event.startDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {event.endDate && event.endDate !== event.startDate && (
                            <> - {new Date(event.endDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}</>
                          )}
                        </p>
                        {event.mode === "multi-day" && (
                          <p className="text-xs text-gray-500 mt-1">
                            {event.days} days event
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm pt-2 border-t">
                        <span className="text-gray-600">Items Packed:</span>
                        <span className="font-semibold">{event.items.length}</span>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => setOpenedEvent(event)}
                      >
                        Open Event
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 mb-4">No events created yet</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Event
              </Button>
            </div>
          )}
        </div>

        {/* Create Event Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Event Name</Label>
                <Input
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  placeholder="Enter event name"
                />
              </div>
              <div>
                <Label>Event Type</Label>
                <Select
                  value={newEvent.type}
                  onValueChange={(value) => setNewEvent({ ...newEvent, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sunday">Sunday Event</SelectItem>
                    <SelectItem value="Katha">Katha</SelectItem>
                    <SelectItem value="Festival">Festival</SelectItem>
                    <SelectItem value="Special">Special Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Event Mode</Label>
                <Select
                  value={newEvent.mode}
                  onValueChange={(value: "single-day" | "multi-day") =>
                    setNewEvent({ ...newEvent, mode: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single-day">Single Day</SelectItem>
                    <SelectItem value="multi-day">Multi Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newEvent.mode === "multi-day" && (
                <div>
                  <Label>Number of Days</Label>
                  <Input
                    type="number"
                    min="2"
                    value={newEvent.days}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, days: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              )}
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newEvent.startDate}
                  onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateEvent} className="w-full">
                Create Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Event Details View (with tabs)
  const packingProgress = openedEvent.items.length > 0 
    ? Math.round((openedEvent.items.length / (openedEvent.items.length + 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setOpenedEvent(null)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{openedEvent.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              className={
                openedEvent.status === "Active"
                  ? "bg-green-600"
                  : openedEvent.status === "Planned"
                  ? "bg-blue-600"
                  : openedEvent.status === "Paused"
                  ? "bg-orange-500"
                  : "bg-gray-600"
              }
            >
              {openedEvent.status === "Planned" ? "Packing" : openedEvent.status}
            </Badge>
            <Badge variant="outline">{openedEvent.type}</Badge>
            <Badge variant="outline">
              {openedEvent.mode === "multi-day" ? `${openedEvent.days} days` : "Single day"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Event Tabs */}
      <Tabs defaultValue="packing" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="packing">
            <Package className="h-4 w-4 mr-2" />
            Packing
          </TabsTrigger>
          <TabsTrigger value="control">
            <Play className="h-4 w-4 mr-2" />
            Event Control
          </TabsTrigger>
          <TabsTrigger value="day-summary">
            <Clock className="h-4 w-4 mr-2" />
            Day-wise Summary
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Packing */}
        <TabsContent value="packing" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Packing Progress</CardTitle>
                <Button onClick={() => setIsPackDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Items Packed</span>
                    <span className="text-sm font-medium">
                      {openedEvent.items.length} items
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(packingProgress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Packing Table */}
                {openedEvent.items.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                            User
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                            Item
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                            Qty
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {openedEvent.items.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(item.addedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {item.addedBy}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {item.itemName}
                              <span className="text-xs text-gray-500 ml-2">({item.area})</span>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              {item.initialQuantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 border rounded-lg">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No items packed yet</p>
                    <p className="text-sm mt-1">Start packing items for this event</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Event Control (Admin) */}
        <TabsContent value="control" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Control Panel</CardTitle>
            </CardHeader>
            <CardContent>
              {!isAdmin ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Admin access required</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Status Display */}
                  <div className="p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm text-gray-600">Current Status</Label>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {openedEvent.status === "Planned" ? "Packing Phase" : openedEvent.status}
                        </p>
                      </div>
                      <Badge
                        className={`text-lg px-4 py-2 ${
                          openedEvent.status === "Active"
                            ? "bg-green-600"
                            : openedEvent.status === "Planned"
                            ? "bg-blue-600"
                            : openedEvent.status === "Paused"
                            ? "bg-orange-500"
                            : "bg-gray-600"
                        }`}
                      >
                        {openedEvent.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="space-y-3">
                    {openedEvent.status === "Planned" && (
                      <Button
                        className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
                        onClick={() => handleStatusChange("Active")}
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Start Event
                      </Button>
                    )}

                    {openedEvent.status === "Active" && (
                      <>
                        <Button
                          className="w-full h-14 text-lg bg-orange-500 hover:bg-orange-600"
                          variant="outline"
                          onClick={() => handleStatusChange("Paused")}
                        >
                          <Pause className="h-5 w-5 mr-2" />
                          Pause Event
                        </Button>
                        <Button
                          className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleStatusChange("Completed")}
                        >
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Complete Event
                        </Button>
                      </>
                    )}

                    {openedEvent.status === "Paused" && (
                      <Button
                        className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
                        onClick={() => handleStatusChange("Active")}
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Resume Event
                      </Button>
                    )}

                    {openedEvent.status === "Completed" && (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-600" />
                        <p className="text-lg font-medium text-gray-900">Event Completed</p>
                        <p className="text-sm mt-1">View day-wise summary for details</p>
                      </div>
                    )}
                  </div>

                  {/* Event Info */}
                  <div className="pt-6 border-t space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Event Duration</span>
                      <span className="font-medium">
                        {openedEvent.mode === "multi-day"
                          ? `${openedEvent.days} days`
                          : "1 day"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Start Date</span>
                      <span className="font-medium">
                        {new Date(openedEvent.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    {openedEvent.mode === "multi-day" && openedEvent.status === "Active" && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Current Day</span>
                        <Badge className="bg-indigo-600">
                          Day {openedEvent.currentDay || 1} of {openedEvent.days}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Day-wise Summary */}
        <TabsContent value="day-summary" className="space-y-6">
          {openedEvent.mode === "single-day" ? (
            <Card>
              <CardHeader>
                <CardTitle>Event Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    Single day event summary - Available after event completion
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: openedEvent.days || 1 }, (_, i) => i + 1).map((day) => {
                  const dayDate = new Date(openedEvent.startDate);
                  dayDate.setDate(dayDate.getDate() + (day - 1));
                  const isCurrentDay = openedEvent.currentDay === day;
                  const isPastDay = openedEvent.currentDay && day < openedEvent.currentDay;

                  return (
                    <Card
                      key={day}
                      className={`cursor-pointer hover:shadow-lg transition-shadow ${
                        isCurrentDay ? "border-2 border-indigo-600" : ""
                      }`}
                      onClick={() => setSelectedDay(day)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Day {day}</CardTitle>
                          {isCurrentDay && (
                            <Badge className="bg-indigo-600">Current</Badge>
                          )}
                          {isPastDay && (
                            <Badge className="bg-green-600">Completed</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">
                            {dayDate.toLocaleDateString("en-IN", {
                              weekday: "long",
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                          <div className="pt-2 border-t space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Sales:</span>
                              <span className="font-medium">—</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Revenue:</span>
                              <span className="font-medium">—</span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="w-full mt-3">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Day Detail Dialog */}
              {selectedDay && (
                <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Day {selectedDay} - Detailed Summary</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <p className="text-sm text-gray-600">Total Sales</p>
                            <p className="text-2xl font-bold">0</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <p className="text-sm text-gray-600">Revenue</p>
                            <p className="text-2xl font-bold">₹0</p>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="text-center py-8 text-gray-500">
                        <p>No activity recorded for this day</p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Pack Items Dialog */}
      <Dialog open={isPackDialogOpen} onOpenChange={setIsPackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pack Items for {openedEvent.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Item from Main Vault</Label>
              <Select
                value={packData.itemId}
                onValueChange={(value) => setPackData({ ...packData, itemId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {appState.inventory
                    .filter((item) => item.quantity > 0)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.quantity} available)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {packData.itemId && (
              <div>
                <Label>Quantity to Pack</Label>
                <Input
                  type="number"
                  value={packData.quantity}
                  onChange={(e) =>
                    setPackData({ ...packData, quantity: parseInt(e.target.value) || 0 })
                  }
                  placeholder="Enter quantity"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available:{" "}
                  {appState.inventory.find((i) => i.id === packData.itemId)?.quantity || 0}
                </p>
              </div>
            )}
            <Button onClick={handlePackItem} className="w-full">
              Pack Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
