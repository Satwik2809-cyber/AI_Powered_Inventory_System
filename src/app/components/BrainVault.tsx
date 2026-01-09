import { useState } from "react";
import { AppState, User } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { Users, UserPlus, Shield, Edit, Eye, ArrowLeft, TrendingUp, Wallet, CreditCard } from "lucide-react";

interface BrainVaultProps {
  appState: AppState;
  setAppState: (state: AppState) => void;
}

const areas = ["All", "Homecare", "Food", "Utilities", "Books", "Electronics", "Clothing"];

export default function BrainVault({ appState, setAppState }: BrainVaultProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewingUserDetails, setViewingUserDetails] = useState<User | null>(null);

  const [newUser, setNewUser] = useState({
    username: "",
    name: "",
    role: "Sevadar" as "Admin" | "Sevadar",
    assignedAreas: [] as string[],
  });

  const [editData, setEditData] = useState({
    assignedAreas: [] as string[],
  });

  const currentUser = appState.currentUser!;
  const isAdmin = currentUser.role === "Admin";

  const handleAddUser = () => {
    if (!newUser.username || !newUser.name || newUser.assignedAreas.length === 0) {
      toast.error("Please fill all fields");
      return;
    }

    const user: User = {
      id: `user-${Date.now()}`,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
      assignedAreas: newUser.assignedAreas,
    };

    setAppState({
      ...appState,
      users: [...appState.users, user],
    });

    toast.success(`User ${user.name} added successfully`);
    setNewUser({
      username: "",
      name: "",
      role: "Sevadar",
      assignedAreas: [],
    });
    setIsAddDialogOpen(false);
  };

  const handleEditUser = () => {
    if (!selectedUser || editData.assignedAreas.length === 0) {
      toast.error("Please select at least one area");
      return;
    }

    const updatedUsers = appState.users.map((user) =>
      user.id === selectedUser.id
        ? { ...user, assignedAreas: editData.assignedAreas }
        : user
    );

    setAppState({
      ...appState,
      users: updatedUsers,
    });

    toast.success(`Updated areas for ${selectedUser.name}`);
    setIsEditDialogOpen(false);
    setSelectedUser(null);
  };

  const getUserActivity = (userId: string) => {
    const userSales = appState.sales.filter((sale) => {
      const user = appState.users.find((u) => u.name === sale.soldBy);
      return user?.id === userId;
    });

    const userEvents = appState.events.filter((event) => {
      const user = appState.users.find((u) => u.name === event.createdBy);
      return user?.id === userId;
    });

    return {
      sales: userSales.length,
      revenue: userSales.reduce((sum, sale) => sum + sale.quantity * sale.rate, 0),
      events: userEvents.length,
    };
  };

  const getUserDetailedStats = (userId: string) => {
    const user = appState.users.find((u) => u.id === userId);
    if (!user) return null;

    const userSales = appState.sales.filter((sale) => sale.soldBy === user.name);
    const eventSales = userSales.filter((s) => s.eventId);
    const dailySales = userSales.filter((s) => !s.eventId);

    // Group by event
    const eventSalesMap = new Map<string, { eventName: string; sales: number; revenue: number }>();
    eventSales.forEach((sale) => {
      const event = appState.events.find((e) => e.id === sale.eventId);
      const eventName = event?.name || "Unknown Event";
      const existing = eventSalesMap.get(sale.eventId!) || { eventName, sales: 0, revenue: 0 };
      eventSalesMap.set(sale.eventId!, {
        eventName,
        sales: existing.sales + 1,
        revenue: existing.revenue + sale.quantity * sale.rate,
      });
    });

    return {
      totalSales: userSales.length,
      totalRevenue: userSales.reduce((sum, s) => sum + s.quantity * s.rate, 0),
      eventSalesCount: eventSales.length,
      eventRevenue: eventSales.reduce((sum, s) => sum + s.quantity * s.rate, 0),
      dailySalesCount: dailySales.length,
      dailyRevenue: dailySales.reduce((sum, s) => sum + s.quantity * s.rate, 0),
      eventBreakdown: Array.from(eventSalesMap.values()),
      cashPayments: userSales.length * 0.6, // Mock
      onlinePayments: userSales.length * 0.4, // Mock
    };
  };

  const toggleArea = (area: string, isNewUser: boolean = false) => {
    if (isNewUser) {
      const current = newUser.assignedAreas;
      if (current.includes(area)) {
        setNewUser({
          ...newUser,
          assignedAreas: current.filter((a) => a !== area),
        });
      } else {
        setNewUser({
          ...newUser,
          assignedAreas: [...current, area],
        });
      }
    } else {
      const current = editData.assignedAreas;
      if (current.includes(area)) {
        setEditData({
          assignedAreas: current.filter((a) => a !== area),
        });
      } else {
        setEditData({
          assignedAreas: [...current, area],
        });
      }
    }
  };

  // User Detail View
  if (viewingUserDetails) {
    const stats = getUserDetailedStats(viewingUserDetails.id);

    return (
      <div className="space-y-6">
        {/* Header with Back */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setViewingUserDetails(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{viewingUserDetails.name}</h1>
              {viewingUserDetails.role === "Admin" && (
                <Shield className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <p className="text-gray-500 mt-1">@{viewingUserDetails.username} • {viewingUserDetails.role}</p>
          </div>
        </div>

        {stats && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Sales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSales}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ₹{stats.totalRevenue.toFixed(0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Event Sales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.eventSalesCount}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ₹{stats.eventRevenue.toFixed(0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Daily Sales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.dailySalesCount}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ₹{stats.dailyRevenue.toFixed(0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Assigned Areas */}
            <Card>
              <CardHeader>
                <CardTitle>Assigned Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {viewingUserDetails.assignedAreas.map((area) => (
                    <Badge key={area} variant="outline" className="text-sm">
                      {area}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Events Handled */}
            <Card>
              <CardHeader>
                <CardTitle>Events Handled</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.eventBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {stats.eventBreakdown.map((event, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{event.eventName}</p>
                          <p className="text-sm text-gray-600">{event.sales} sales</p>
                        </div>
                        <p className="text-lg font-semibold text-green-600">
                          ₹{event.revenue.toFixed(0)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No event sales recorded</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Wallet className="h-5 w-5 mr-2 text-green-600" />
                    Cash Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    ~₹{(stats.totalRevenue * 0.6).toFixed(0)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Estimated 60% of total</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                    Online Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">
                    ~₹{(stats.totalRevenue * 0.4).toFixed(0)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Estimated 40% of total</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    );
  }

  // User List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Brain Vault</h1>
          <p className="text-gray-500 mt-1">User management and audit tracking</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appState.users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {appState.users.filter((u) => u.role === "Admin").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Sevadars
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {appState.users.filter((u) => u.role === "Sevadar").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">User List</h2>
        <div className="space-y-3">
          {appState.users.map((user) => {
            const activity = getUserActivity(user.id);

            return (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{user.name}</h3>
                          {user.role === "Admin" && (
                            <Shield className="h-4 w-4 text-blue-600" />
                          )}
                          <Badge variant={user.role === "Admin" ? "default" : "secondary"}>
                            {user.role}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              activity.sales > 0 ? "bg-green-50 text-green-700" : ""
                            }
                          >
                            {activity.sales > 0 ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          @{user.username} • {user.assignedAreas.join(", ")}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 mr-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Sales</p>
                        <p className="text-lg font-semibold text-gray-900">{activity.sales}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Revenue</p>
                        <p className="text-lg font-semibold text-green-600">
                          ₹{activity.revenue.toFixed(0)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Events</p>
                        <p className="text-lg font-semibold text-indigo-600">
                          {activity.events}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingUserDetails(user)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      {isAdmin && user.id !== currentUser.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedUser(user);
                            setEditData({ assignedAreas: [...user.assignedAreas] });
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label>Username</Label>
              <Input
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: "Admin" | "Sevadar") =>
                  setNewUser({ ...newUser, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Sevadar">Sevadar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned Areas</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {areas.map((area) => (
                  <Badge
                    key={area}
                    variant={
                      newUser.assignedAreas.includes(area) ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleArea(area, true)}
                  >
                    {area}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Click to select/deselect areas
              </p>
            </div>
            <Button onClick={handleAddUser} className="w-full">
              Add User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Areas - {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Assigned Areas</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {areas.map((area) => (
                  <Badge
                    key={area}
                    variant={
                      editData.assignedAreas.includes(area) ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleArea(area, false)}
                  >
                    {area}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Click to select/deselect areas
              </p>
            </div>
            <Button onClick={handleEditUser} className="w-full">
              Update Areas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
