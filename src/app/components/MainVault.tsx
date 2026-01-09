import { useState } from "react";
import { AppState, InventoryItem, SaleRecord } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { 
  Plus, 
  Package, 
  Search, 
  ShoppingCart, 
  TrendingUp, 
  Mic, 
  Camera, 
  Check,
  X,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  Eye
} from "lucide-react";

interface MainVaultProps {
  appState: AppState;
  setAppState: (state: AppState) => void;
}

const areas = ["Homecare", "Food", "Utilities", "Books", "Electronics", "Clothing"];

interface SaleItem {
  itemId: string;
  itemName: string;
  quantity: number;
  rate: number;
  area: string;
}

export default function MainVault({ appState, setAppState }: MainVaultProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterArea, setFilterArea] = useState<string>("All");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Daily Sell state
  const [sellItemName, setSellItemName] = useState("");
  const [sellQuantity, setSellQuantity] = useState("");
  const [sellRate, setSellRate] = useState("");
  const [tempSalesList, setTempSalesList] = useState<SaleItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Online">("Cash");
  const [buyerName, setBuyerName] = useState("");

  const [newItem, setNewItem] = useState({
    name: "",
    area: "",
    quantity: 0,
    rate: 0,
  });

  const [restockData, setRestockData] = useState({
    quantity: 0,
    rate: 0,
  });

  const filteredItems = appState.inventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = filterArea === "All" || item.area === filterArea;
    return matchesSearch && matchesArea;
  });

  const handleAddItem = () => {
    if (!newItem.name || !newItem.area || newItem.quantity <= 0 || newItem.rate <= 0) {
      toast.error("Please fill all fields with valid values");
      return;
    }

    const item: InventoryItem = {
      id: `item-${Date.now()}`,
      name: newItem.name,
      area: newItem.area,
      quantity: newItem.quantity,
      rate: newItem.rate,
      createdBy: appState.currentUser!.name,
      createdAt: new Date().toISOString(),
    };

    setAppState({
      ...appState,
      inventory: [...appState.inventory, item],
    });

    toast.success(`${item.name} added to Main Vault`);
    setNewItem({ name: "", area: "", quantity: 0, rate: 0 });
    setIsAddDialogOpen(false);
  };

  const handleRestock = () => {
    if (!selectedItem || restockData.quantity <= 0) {
      toast.error("Invalid restock quantity");
      return;
    }

    const updatedInventory = appState.inventory.map((item) =>
      item.id === selectedItem.id
        ? {
            ...item,
            quantity: item.quantity + restockData.quantity,
            rate: restockData.rate > 0 ? restockData.rate : item.rate,
            lastRestockedBy: appState.currentUser!.name,
            lastRestockedAt: new Date().toISOString(),
          }
        : item
    );

    setAppState({
      ...appState,
      inventory: updatedInventory,
    });

    toast.success(`${selectedItem.name} restocked successfully`);
    setRestockData({ quantity: 0, rate: 0 });
    setIsRestockDialogOpen(false);
    setSelectedItem(null);
  };

  // Daily Sell handlers
  const handleAddToSellList = () => {
    const item = appState.inventory.find(
      (i) => i.name.toLowerCase() === sellItemName.toLowerCase()
    );

    if (!item) {
      toast.error("Item not found in inventory");
      return;
    }

    const qty = parseInt(sellQuantity);
    const rate = parseFloat(sellRate) || item.rate;

    if (!qty || qty <= 0) {
      toast.error("Please enter valid quantity");
      return;
    }

    if (qty > item.quantity) {
      toast.error(`Only ${item.quantity} units available`);
      return;
    }

    const saleItem: SaleItem = {
      itemId: item.id,
      itemName: item.name,
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
    if (tempSalesList.length === 0) {
      toast.error("No items in sale list");
      return;
    }

    // Create sales records
    const newSales: SaleRecord[] = tempSalesList.map((item) => ({
      id: `sale-${Date.now()}-${Math.random()}`,
      itemId: item.itemId,
      itemName: item.itemName,
      quantity: item.quantity,
      rate: item.rate,
      area: item.area,
      soldBy: appState.currentUser!.name,
      soldTo: buyerName || undefined,
      timestamp: new Date().toISOString(),
    }));

    // Update inventory
    const updatedInventory = appState.inventory.map((item) => {
      const soldItem = tempSalesList.find((s) => s.itemId === item.id);
      if (soldItem) {
        return { ...item, quantity: item.quantity - soldItem.quantity };
      }
      return item;
    });

    setAppState({
      ...appState,
      inventory: updatedInventory,
      sales: [...appState.sales, ...newSales],
    });

    const totalAmount = tempSalesList.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    toast.success(`Sale completed! Total: ₹${totalAmount.toFixed(2)} (${paymentMode})`);
    
    setTempSalesList([]);
    setBuyerName("");
    setPaymentMode("Cash");
  };

  const handleVoiceInput = () => {
    toast.info("Voice input feature - Coming soon");
  };

  const handleCameraInput = () => {
    toast.info("Camera recognition feature - Coming soon");
  };

  const totalSalesValue = tempSalesList.reduce((sum, item) => sum + item.quantity * item.rate, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Main Vault</h1>
          <p className="text-gray-500 mt-1">Central inventory management</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Item Name</Label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Enter item name"
                />
              </div>
              <div>
                <Label>Area / Category</Label>
                <Select
                  value={newItem.area}
                  onValueChange={(value) => setNewItem({ ...newItem, area: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) =>
                    setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })
                  }
                  placeholder="Enter quantity"
                />
              </div>
              <div>
                <Label>Rate (₹)</Label>
                <Input
                  type="number"
                  value={newItem.rate}
                  onChange={(e) =>
                    setNewItem({ ...newItem, rate: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Enter rate per unit"
                />
              </div>
              <Button onClick={handleAddItem} className="w-full">
                Add Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appState.inventory.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Quantity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appState.inventory.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹
              {appState.inventory
                .reduce((sum, item) => sum + item.quantity * item.rate, 0)
                .toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products">
            <Package className="h-4 w-4 mr-2" />
            Products
          </TabsTrigger>
          <TabsTrigger value="daily-sell">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Daily Sell
          </TabsTrigger>
          <TabsTrigger value="import-export">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import / Export
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Products */}
        <TabsContent value="products" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterArea} onValueChange={setFilterArea}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Areas</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                {/* Image Placeholder */}
                <div className="h-32 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  <Package className="h-12 w-12 text-indigo-400" />
                </div>
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <Badge variant="outline" className="mt-2">
                        {item.area}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Quantity:</span>
                      <span
                        className={`text-xl font-bold ${
                          item.quantity < 10
                            ? "text-red-600"
                            : item.quantity < 20
                            ? "text-orange-600"
                            : "text-green-600"
                        }`}
                      >
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Rate:</span>
                      <span className="font-semibold text-gray-900">₹{item.rate}</span>
                    </div>
                    
                    {/* Expiry Indicator (mock) */}
                    <div className="flex items-center justify-between py-2 px-3 bg-green-50 rounded border border-green-200">
                      <span className="text-xs text-gray-600">Status:</span>
                      <Badge className="bg-green-600 text-xs">Fresh</Badge>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setSelectedItem(item);
                          setIsViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedItem(item);
                          setRestockData({ quantity: 0, rate: item.rate });
                          setIsRestockDialogOpen(true);
                        }}
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Restock
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No items found</p>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Daily Sell */}
        <TabsContent value="daily-sell" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Selling Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Sell Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Manual Input */}
                <div>
                  <Label>Item Name</Label>
                  <Input
                    value={sellItemName}
                    onChange={(e) => setSellItemName(e.target.value)}
                    placeholder="Enter item name"
                    list="inventory-items"
                  />
                  <datalist id="inventory-items">
                    {appState.inventory.map((item) => (
                      <option key={item.id} value={item.name} />
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
                    Voice Input
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleCameraInput}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Camera Scan
                  </Button>
                </div>

                <Button onClick={handleAddToSellList} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add to List
                </Button>

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
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
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
              </CardContent>
            </Card>

            {/* Live Selling List */}
            <Card>
              <CardHeader>
                <CardTitle>Sale List</CardTitle>
              </CardHeader>
              <CardContent>
                {tempSalesList.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No items added yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tempSalesList.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.itemName}</p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} × ₹{item.rate} = ₹{item.quantity * item.rate}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveFromSellList(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-lg font-semibold">Total:</span>
                        <span className="text-2xl font-bold text-indigo-600">
                          ₹{totalSalesValue.toFixed(2)}
                        </span>
                      </div>
                      <Button
                        onClick={handleConfirmSales}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Confirm Sale
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Import / Export */}
        <TabsContent value="import-export" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Import Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="h-5 w-5 mr-2" />
                  Import Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports Excel (.xlsx, .xls) and CSV files
                  </p>
                  <Button className="mt-4">
                    <Upload className="h-4 w-4 mr-2" />
                    Select File
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-2">File Format Requirements:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• Column 1: Item Name</li>
                        <li>• Column 2: Category/Area</li>
                        <li>• Column 3: Quantity</li>
                        <li>• Column 4: Rate</li>
                        <li>• First row should be headers</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="h-5 w-5 mr-2" />
                  Export Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Download your inventory data in your preferred format
                </p>

                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                    Export as Excel (.xlsx)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-blue-600" />
                    Export as CSV (.csv)
                  </Button>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Current Inventory Summary:
                  </p>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>• Total Items: {appState.inventory.length}</p>
                    <p>
                      • Total Units:{" "}
                      {appState.inventory.reduce((sum, item) => sum + item.quantity, 0)}
                    </p>
                    <p>
                      • Total Value: ₹
                      {appState.inventory
                        .reduce((sum, item) => sum + item.quantity * item.rate, 0)
                        .toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <h4>Import Guidelines:</h4>
                <ul>
                  <li>Prepare your data in Excel or CSV format</li>
                  <li>Ensure all required fields are filled</li>
                  <li>Use consistent category names</li>
                  <li>Duplicate items will be updated with new quantities</li>
                  <li>Maximum file size: 5MB</li>
                </ul>

                <h4 className="mt-4">Export Options:</h4>
                <ul>
                  <li>Excel format includes formatting and is best for backup</li>
                  <li>CSV format is compatible with most systems</li>
                  <li>Exported files include all inventory metadata</li>
                  <li>Use exports for regular backups and audits</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Item Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Item Details</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="h-40 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                <Package className="h-16 w-16 text-indigo-400" />
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500">Item Name</Label>
                  <p className="font-semibold text-lg">{selectedItem.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Category</Label>
                    <p className="font-medium">{selectedItem.area}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Quantity</Label>
                    <p className="font-medium text-lg">{selectedItem.quantity}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Rate</Label>
                    <p className="font-medium">₹{selectedItem.rate}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Total Value</Label>
                    <p className="font-medium">
                      ₹{(selectedItem.quantity * selectedItem.rate).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <Label className="text-xs text-gray-500">Created By</Label>
                  <p className="text-sm">{selectedItem.createdBy}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(selectedItem.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedItem.lastRestockedBy && (
                  <div>
                    <Label className="text-xs text-gray-500">Last Restocked By</Label>
                    <p className="text-sm">{selectedItem.lastRestockedBy}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(selectedItem.lastRestockedAt!).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={isRestockDialogOpen} onOpenChange={setIsRestockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Quantity</Label>
              <Input value={selectedItem?.quantity || 0} disabled />
            </div>
            <div>
              <Label>Add Quantity</Label>
              <Input
                type="number"
                value={restockData.quantity}
                onChange={(e) =>
                  setRestockData({ ...restockData, quantity: parseInt(e.target.value) || 0 })
                }
                placeholder="Enter quantity to add"
              />
            </div>
            <div>
              <Label>Update Rate (Optional)</Label>
              <Input
                type="number"
                value={restockData.rate}
                onChange={(e) =>
                  setRestockData({ ...restockData, rate: parseFloat(e.target.value) || 0 })
                }
                placeholder="Enter new rate or leave current"
              />
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">New Quantity:</span>{" "}
                {(selectedItem?.quantity || 0) + restockData.quantity}
              </p>
            </div>
            <Button onClick={handleRestock} className="w-full">
              Restock Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
