import { AppState } from "../App";
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
  Clock
} from "lucide-react";

interface DashboardHomeProps {
  appState: AppState;
  setCurrentView: (view: DashboardView) => void;
}

export default function DashboardHome({ appState, setCurrentView }: DashboardHomeProps) {
  const isAdmin = appState.currentUser?.role === "Admin";
  const activeEvents = appState.events.filter((e) => e.status === "Active");
  const activeEvent = activeEvents[0]; // Get first active event

  // Calculate today's sales (event + daily)
  const todaySales = appState.sales.filter((sale) => {
    const saleDate = new Date(sale.timestamp);
    const today = new Date();
    return saleDate.toDateString() === today.toDateString();
  });

  const todayEventSales = todaySales.filter((sale) => sale.eventId);
  const todayDailySales = todaySales.filter((sale) => !sale.eventId);

  const todayRevenue = todaySales.reduce(
    (sum, sale) => sum + sale.quantity * sale.rate,
    0
  );

  const todayEventRevenue = todayEventSales.reduce(
    (sum, sale) => sum + sale.quantity * sale.rate,
    0
  );

  const todayDailyRevenue = todayDailySales.reduce(
    (sum, sale) => sum + sale.quantity * sale.rate,
    0
  );

  // Calculate cash vs online (mock - we'll need to add payment mode to sales)
  const cashSales = todaySales.length * 0.6; // 60% cash (mock)
  const onlineSales = todaySales.length * 0.4; // 40% online (mock)

  // Low stock and expiry alerts
  const lowStockItems = appState.inventory.filter((item) => item.quantity < 20);
  const criticalStockItems = appState.inventory.filter((item) => item.quantity < 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {appState.currentUser?.name}
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Daily Sell (Main Vault) */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView("main-vault")}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-blue-600 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <Badge className="bg-blue-600">Main Vault</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Daily Sell</h3>
            <p className="text-3xl font-bold text-blue-600 mb-2">
              ₹{todayDailyRevenue.toFixed(0)}
            </p>
            <p className="text-sm text-gray-600">
              {todayDailySales.length} sales today
            </p>
            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
              Make Sale
            </Button>
          </CardContent>
        </Card>

        {/* Active Event */}
        <Card className={`border-2 ${activeEvent ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-white' : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white'} hover:shadow-lg transition-shadow cursor-pointer`} onClick={() => setCurrentView("event-vault")}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-lg ${activeEvent ? 'bg-yellow-500' : 'bg-gray-400'}`}>
                <Calendar className="h-6 w-6 text-white" />
              </div>
              {activeEvent ? (
                <Badge className="bg-green-600">Active</Badge>
              ) : (
                <Badge variant="outline">No Event</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {activeEvent ? activeEvent.name : "No Active Event"}
            </h3>
            <p className={`text-3xl font-bold mb-2 ${activeEvent ? 'text-yellow-600' : 'text-gray-400'}`}>
              {activeEvent ? `₹${todayEventRevenue.toFixed(0)}` : "—"}
            </p>
            <p className="text-sm text-gray-600">
              {activeEvent
                ? `Day ${activeEvent.currentDay || 1}${activeEvent.mode === "multi-day" ? ` of ${activeEvent.days}` : ""}`
                : "Create or start an event"}
            </p>
            <Button className={`w-full mt-4 ${activeEvent ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-400'}`}>
              {activeEvent ? "View Event" : "Create Event"}
            </Button>
          </CardContent>
        </Card>

        {/* Start/Continue Day (Event Context) */}
        <Card className={`border-2 ${activeEvent ? 'border-green-200 bg-gradient-to-br from-green-50 to-white' : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white opacity-60'} hover:shadow-lg transition-shadow ${activeEvent ? 'cursor-pointer' : 'cursor-not-allowed'}`} onClick={() => activeEvent && setCurrentView("user-vault")}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-lg ${activeEvent ? 'bg-green-600' : 'bg-gray-400'}`}>
                <PlayCircle className="h-6 w-6 text-white" />
              </div>
              {activeEvent ? (
                <Badge className="bg-green-600">Ready</Badge>
              ) : (
                <Badge variant="outline">Disabled</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Event Selling</h3>
            <p className={`text-3xl font-bold mb-2 ${activeEvent ? 'text-green-600' : 'text-gray-400'}`}>
              {activeEvent ? "Active" : "—"}
            </p>
            <p className="text-sm text-gray-600">
              {activeEvent
                ? "Click to start/continue day"
                : "No active event"}
            </p>
            <Button 
              className={`w-full mt-4 ${activeEvent ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400'}`}
              disabled={!activeEvent}
            >
              {activeEvent ? "Start/Continue" : "Not Available"}
            </Button>
          </CardContent>
        </Card>

        {/* Low Stock / Expiry Alerts */}
        <Card className={`border-2 ${criticalStockItems.length > 0 ? 'border-red-200 bg-gradient-to-br from-red-50 to-white' : lowStockItems.length > 0 ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-white' : 'border-green-200 bg-gradient-to-br from-green-50 to-white'} hover:shadow-lg transition-shadow cursor-pointer`} onClick={() => setCurrentView("main-vault")}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-lg ${criticalStockItems.length > 0 ? 'bg-red-600' : lowStockItems.length > 0 ? 'bg-orange-500' : 'bg-green-600'}`}>
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              {criticalStockItems.length > 0 ? (
                <Badge className="bg-red-600">Critical</Badge>
              ) : lowStockItems.length > 0 ? (
                <Badge className="bg-orange-500">Warning</Badge>
              ) : (
                <Badge className="bg-green-600">Good</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Stock Status</h3>
            <p className={`text-3xl font-bold mb-2 ${criticalStockItems.length > 0 ? 'text-red-600' : lowStockItems.length > 0 ? 'text-orange-500' : 'text-green-600'}`}>
              {criticalStockItems.length > 0 ? criticalStockItems.length : lowStockItems.length > 0 ? lowStockItems.length : "✓"}
            </p>
            <p className="text-sm text-gray-600">
              {criticalStockItems.length > 0
                ? "Critical items need restock"
                : lowStockItems.length > 0
                ? "Items running low"
                : "All items well stocked"}
            </p>
            <Button className={`w-full mt-4 ${criticalStockItems.length > 0 ? 'bg-red-600 hover:bg-red-700' : lowStockItems.length > 0 ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>
              View Inventory
            </Button>
          </CardContent>
        </Card>

        {/* Monthly Count (Admin Only) */}
        {isAdmin && (
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView("reports")}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-purple-600 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <Badge className="bg-purple-600">Admin</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Monthly Count</h3>
              <p className="text-3xl font-bold text-purple-600 mb-2">
                {new Date().toLocaleDateString("en-IN", { month: "short" })}
              </p>
              <p className="text-sm text-gray-600">
                View monthly reports & analytics
              </p>
              <Button className="w-full mt-4 bg-purple-600 hover:bg-purple-700">
                View Reports
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dashboard Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Sales Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Clock className="h-5 w-5 mr-2 text-indigo-600" />
              Today's Sales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Event Sales</p>
                <p className="text-lg font-semibold text-gray-900">
                  ₹{todayEventRevenue.toFixed(0)}
                </p>
              </div>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                {todayEventSales.length} sales
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Daily Sales</p>
                <p className="text-lg font-semibold text-gray-900">
                  ₹{todayDailyRevenue.toFixed(0)}
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {todayDailySales.length} sales
              </Badge>
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">Total Today</p>
                <p className="text-xl font-bold text-indigo-600">
                  ₹{todayRevenue.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash vs Online */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Wallet className="h-5 w-5 mr-2 text-indigo-600" />
              Payment Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Wallet className="h-5 w-5 mr-2 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Cash</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ~₹{(todayRevenue * 0.6).toFixed(0)}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                60%
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Online</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ~₹{(todayRevenue * 0.4).toFixed(0)}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                40%
              </Badge>
            </div>
            <p className="text-xs text-gray-500 text-center pt-2">
              Estimated breakdown - actual values in reports
            </p>
          </CardContent>
        </Card>

        {/* Quick Item Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Package className="h-5 w-5 mr-2 text-indigo-600" />
              Item Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {criticalStockItems.length > 0 ? (
                criticalStockItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-red-600">
                        Critical: {item.quantity} left
                      </p>
                    </div>
                    <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  </div>
                ))
              ) : lowStockItems.length > 0 ? (
                lowStockItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-orange-600">
                        Low: {item.quantity} left
                      </p>
                    </div>
                    <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">All items well stocked</p>
                </div>
              )}
            </div>
            {(criticalStockItems.length > 3 || lowStockItems.length > 3) && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => setCurrentView("main-vault")}
              >
                View All Alerts
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {appState.sales.length > 0 ? (
            <div className="space-y-2">
              {appState.sales.slice(-8).reverse().map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {sale.itemName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sale.quantity} × ₹{sale.rate} = ₹{sale.quantity * sale.rate} • {sale.soldBy}
                      {sale.eventId && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Event
                        </Badge>
                      )}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 ml-4 text-right">
                    {new Date(sale.timestamp).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No sales recorded yet</p>
              <p className="text-sm mt-1">Start selling to see activity here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
