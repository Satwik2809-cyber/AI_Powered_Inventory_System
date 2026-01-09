import { useState } from "react";
import { AppState } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Users, 
  Package,
  DollarSign,
  Download,
  Lock,
  CheckCircle
} from "lucide-react";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface ReportsProps {
  appState: AppState;
}

export default function Reports({ appState }: ReportsProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [reportTab, setReportTab] = useState("daily-sell");

  const isAdmin = appState.currentUser?.role === "Admin";

  // Calculate total revenue
  const totalRevenue = appState.sales.reduce(
    (sum, sale) => sum + sale.quantity * sale.rate,
    0
  );

  // Today's sales
  const todaySales = appState.sales.filter((sale) => {
    const saleDate = new Date(sale.timestamp);
    const today = new Date();
    return saleDate.toDateString() === today.toDateString();
  });

  const todayRevenue = todaySales.reduce(
    (sum, sale) => sum + sale.quantity * sale.rate,
    0
  );

  // Monthly revenue
  const monthlyRevenue = appState.sales
    .filter((sale) => {
      const saleDate = new Date(sale.timestamp);
      return (
        saleDate.getMonth() === parseInt(selectedMonth) &&
        saleDate.getFullYear() === parseInt(selectedYear)
      );
    })
    .reduce((sum, sale) => sum + sale.quantity * sale.rate, 0);

  const monthlySalesCount = appState.sales.filter((sale) => {
    const saleDate = new Date(sale.timestamp);
    return (
      saleDate.getMonth() === parseInt(selectedMonth) &&
      saleDate.getFullYear() === parseInt(selectedYear)
    );
  }).length;

  // Event-wise sales
  const eventSales = appState.events.map((event) => {
    const sales = appState.sales.filter((s) => s.eventId === event.id);
    const revenue = sales.reduce((sum, s) => sum + s.quantity * s.rate, 0);
    return {
      event,
      salesCount: sales.length,
      revenue,
    };
  });

  // Item-wise sales
  const itemSales = appState.inventory.map((item) => {
    const sales = appState.sales.filter((s) => s.itemId === item.id);
    const totalSold = sales.reduce((sum, s) => sum + s.quantity, 0);
    const revenue = sales.reduce((sum, s) => sum + s.quantity * s.rate, 0);
    return {
      item,
      sold: totalSold,
      revenue,
    };
  }).filter((i) => i.sold > 0);

  // Daily sell (non-event) sales
  const dailySellSales = appState.sales.filter((s) => !s.eventId);
  const dailySellRevenue = dailySellSales.reduce(
    (sum, s) => sum + s.quantity * s.rate,
    0
  );

  // Area-wise sales
  const areaSales = appState.sales.reduce((acc, sale) => {
    if (!acc[sale.area]) {
      acc[sale.area] = { count: 0, revenue: 0 };
    }
    acc[sale.area].count += 1;
    acc[sale.area].revenue += sale.quantity * sale.rate;
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  // User-wise sales
  const userSales = appState.users.map((user) => {
    const sales = appState.sales.filter((s) => s.soldBy === user.name);
    const revenue = sales.reduce((sum, s) => sum + s.quantity * s.rate, 0);
    return {
      user,
      salesCount: sales.length,
      revenue,
    };
  }).filter((u) => u.salesCount > 0);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  // Mock: month is closed if it's not the current month
  const currentMonth = new Date().getMonth();
  const isMonthClosed = parseInt(selectedMonth) !== currentMonth;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">Comprehensive sales and inventory insights</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">All-time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Today's Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹{todayRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">{todaySales.length} sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Events Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appState.events.filter((e) => e.status === "Completed").length}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {appState.events.filter((e) => e.status === "Active").length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Items in Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appState.inventory.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {appState.inventory.reduce((sum, i) => sum + i.quantity, 0)} total units
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs value={reportTab} onValueChange={setReportTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily-sell">Daily Sell Reports</TabsTrigger>
          <TabsTrigger value="events">Event Reports</TabsTrigger>
          <TabsTrigger value="monthly">
            Monthly Reports
            {isAdmin && <Badge className="ml-2 text-xs">Admin</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Daily Sell Reports */}
        <TabsContent value="daily-sell" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Sell Report (Main Vault)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Daily Sell Revenue</p>
                      <p className="text-4xl font-bold text-blue-600">
                        ₹{dailySellRevenue.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Transactions</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {dailySellSales.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Recent Daily Sales</h4>
                {dailySellSales.length > 0 ? (
                  <div className="space-y-2">
                    {dailySellSales.slice(-10).reverse().map((sale) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{sale.itemName}</p>
                          <p className="text-sm text-gray-600">
                            {sale.quantity} × ₹{sale.rate} • {sale.soldBy}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            ₹{(sale.quantity * sale.rate).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(sale.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No daily sell transactions yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Item-wise breakdown for daily sell */}
          <Card>
            <CardHeader>
              <CardTitle>Item-wise Daily Sell Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {itemSales.length > 0 ? (
                <div className="space-y-3">
                  {itemSales
                    .sort((a, b) => b.revenue - a.revenue)
                    .map(({ item, sold, revenue }) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{item.area}</Badge>
                            <span className="text-xs text-gray-500">
                              {sold} units sold
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">₹{revenue.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">
                            {item.quantity} remaining
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No item sales recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Event Reports */}
        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event-wise Sales Report</CardTitle>
            </CardHeader>
            <CardContent>
              {eventSales.length > 0 ? (
                <div className="space-y-3">
                  {eventSales
                    .sort((a, b) => b.revenue - a.revenue)
                    .map(({ event, salesCount, revenue }) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{event.name}</p>
                            <Badge
                              className={
                                event.status === "Completed"
                                  ? "bg-green-600"
                                  : event.status === "Active"
                                  ? "bg-blue-600"
                                  : "bg-gray-600"
                              }
                            >
                              {event.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {event.type} • {new Date(event.startDate).toLocaleDateString()}
                            {event.mode === "multi-day" && ` (${event.days} days)`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-green-600">
                            ₹{revenue.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">{salesCount} sales</p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No event sales recorded</p>
                  <p className="text-sm mt-1">Create and complete events to see reports</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Area-wise for events */}
          <Card>
            <CardHeader>
              <CardTitle>Area-wise Sales Report</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(areaSales).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(areaSales)
                    .sort(([, a], [, b]) => b.revenue - a.revenue)
                    .map(([area, data]) => (
                      <div
                        key={area}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{area}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {data.count} transactions
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">₹{data.revenue.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No area sales recorded</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User performance */}
          <Card>
            <CardHeader>
              <CardTitle>User Performance Report</CardTitle>
            </CardHeader>
            <CardContent>
              {userSales.length > 0 ? (
                <div className="space-y-3">
                  {userSales
                    .sort((a, b) => b.revenue - a.revenue)
                    .map(({ user, salesCount, revenue }) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.name}</p>
                            <Badge variant={user.role === "Admin" ? "default" : "secondary"}>
                              {user.role}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {user.assignedAreas.join(", ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-green-600">
                            ₹{revenue.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">{salesCount} sales</p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No user sales recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Reports (Admin Only) */}
        <TabsContent value="monthly" className="space-y-6">
          {!isAdmin ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Lock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Required</h3>
                  <p className="text-gray-600">
                    Monthly reports and counts are only accessible to administrators
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Month Selector */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Monthly Report</CardTitle>
                    {isMonthClosed ? (
                      <Badge className="bg-gray-600">
                        <Lock className="h-3 w-3 mr-1" />
                        Closed
                      </Badge>
                    ) : (
                      <Badge className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-6">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border-2 border-purple-200">
                    <p className="text-sm text-gray-600 mb-2">
                      {months[parseInt(selectedMonth)]} {selectedYear} Revenue
                    </p>
                    <p className="text-5xl font-bold text-purple-600 mb-4">
                      ₹{monthlyRevenue.toFixed(2)}
                    </p>
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-purple-200">
                      <div>
                        <p className="text-xs text-gray-600">Sales</p>
                        <p className="text-xl font-bold text-gray-900">
                          {monthlySalesCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Avg per Sale</p>
                        <p className="text-xl font-bold text-gray-900">
                          ₹{monthlySalesCount > 0 ? (monthlyRevenue / monthlySalesCount).toFixed(0) : 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Status</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {isMonthClosed ? "Closed" : "Active"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <Button className="flex-1" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export Excel
                    </Button>
                    <Button className="flex-1" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Event Sales This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-yellow-600">
                      ₹{appState.sales
                        .filter((s) => {
                          const saleDate = new Date(s.timestamp);
                          return (
                            s.eventId &&
                            saleDate.getMonth() === parseInt(selectedMonth) &&
                            saleDate.getFullYear() === parseInt(selectedYear)
                          );
                        })
                        .reduce((sum, s) => sum + s.quantity * s.rate, 0)
                        .toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Sales This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">
                      ₹{appState.sales
                        .filter((s) => {
                          const saleDate = new Date(s.timestamp);
                          return (
                            !s.eventId &&
                            saleDate.getMonth() === parseInt(selectedMonth) &&
                            saleDate.getFullYear() === parseInt(selectedYear)
                          );
                        })
                        .reduce((sum, s) => sum + s.quantity * s.rate, 0)
                        .toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
