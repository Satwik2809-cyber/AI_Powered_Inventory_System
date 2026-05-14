import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Plus,
  Package,
  Search,
  Eye,
  ShoppingCart,
  Upload,
  Download,
  Trash2,
  Box,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  CreditCard,
  Banknote,
  Sparkles,
  Edit2,
  Image as ImageIcon
} from "lucide-react";

import AISpeech from "./AISpeech";
import CameraScan from "./CameraScan";

import { apiGet, apiPost, apiDownload, apiDelete, apiPostFile, apiPut, apiPostFormData } from "../api";
import { User } from "./type";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

/* ---------------- CONSTANTS ---------------- */
const AREAS = [
  "Homecare", "Consumable", "Selfcare", "Books", "Medicine", "Masala",
  "Oil", "Bracelet", "Mala", "Key Ring", "Calendars", "Other SAP",
  "Pen", "Swaroop", "Stickers", "Blocks", "Akhand Gyan", "Akhand Gyan Set"
];

/* ---------------- TYPES ---------------- */
interface Product {
  id: number;
  name: string;
  category: string;
  rate: number;
  quantity: number;
  manufacturing_date?: string;
  expiry_date?: string;
  is_active: boolean;
}

interface SaleItem {
  product_id: number;
  name: string;
  category: string;
  quantity: number;
  rate: number;
}

interface StockHistory {
  id: number;
  quantity: number;
  manufacturing_date: string;
  expiry_date: string;
  restocked_by: string;
  created_at: string;
}

/* ================= COMPONENT ================= */
export default function MainVault({
  currentUser,
  isAdmin,
  setCurrentView,
  initialTab = "products"
}: { currentUser: User; isAdmin: boolean; setCurrentView: any; initialTab?: string }) {
  /* ---------------- STATE ---------------- */
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterArea, setFilterArea] = useState("All");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState<any[]>([]);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  const [globalImageLibraryOpen, setGlobalImageLibraryOpen] = useState(false);
  const [globalImages, setGlobalImages] = useState<any[]>([]);
  const [loadingGlobalImages, setLoadingGlobalImages] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    rate: "",
    quantity: "",
    manufacturing_date: "",
    expiry_date: "",
  });

  const [restockQty, setRestockQty] = useState("");
  const [restockMfg, setRestockMfg] = useState("");
  const [restockExp, setRestockExp] = useState("");

  /* ---------- DAILY SELL ---------- */
  const [sellName, setSellName] = useState("");
  const [sellQty, setSellQty] = useState("");
  const [sellRate, setSellRate] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [isGift, setIsGift] = useState(false);
  const [cart, setCart] = useState<SaleItem[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);

  /* ---------- MONTHLY LEDGER ---------- */
  const [monthlySales, setMonthlySales] = useState<any[]>([]);
  const [ledgerMonth, setLedgerMonth] = useState(new Date().getMonth() + 1);
  const [ledgerYear, setLedgerYear] = useState(new Date().getFullYear());

  async function loadMonthlySales() {
    try {
      const data = await apiGet(`/sales/daily/monthly?month=${ledgerMonth}&year=${ledgerYear}`);
      setMonthlySales(data.sales_history || []);
    } catch {
      toast.error("Failed to load monthly ledger");
    }
  }

  useEffect(() => {
     loadMonthlySales();
  }, [ledgerMonth, ledgerYear]);

  /* ---------------- LOAD PRODUCTS ---------------- */
  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await apiGet(`/products`);
      setProducts(data);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  async function loadStockHistory(name: string, category: string) {
    setLoadingHistory(true);
    try {
      const data = await apiGet(
        `/products/stock-history?name=${encodeURIComponent(name)}&category=${encodeURIComponent(category)}`
      );
      setStockHistory(data);
    } catch {
      toast.error("Failed to load stock history");
    } finally {
      setLoadingHistory(false);
    }
  }

  /* ---------------- EXCEL IMPORT / EXPORT ---------------- */
  function openFilePicker() {
    fileRef.current?.click();
  }

  async function handleImportExcel(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    try {
      await apiPostFile(`/products/import-excel`, file);
      toast.success("Excel imported successfully");
      loadProducts();
    } catch {
      toast.error("Excel import failed");
    }
  }

  async function handleExportExcel() {
    try {
      toast.info("Downloading...");
      const filename = `products_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      await apiDownload("/products/export-excel", filename);
      toast.success("Export successful");
    } catch {
      toast.error("Export failed");
    }
  }

  /* ---------------- ADD PRODUCT ---------------- */
  async function handleAddProduct() {
    if (!newProduct.name || !newProduct.category || !newProduct.rate) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      await apiPost(`/products`, {
        name: newProduct.name,
        category: newProduct.category,
        rate: Number(newProduct.rate),
        quantity: newProduct.quantity ? Number(newProduct.quantity) : 0,
        manufacturing_date: newProduct.manufacturing_date || null,
        expiry_date: newProduct.expiry_date || null,
      });

      toast.success("Product created");
      setIsAddDialogOpen(false);
      setNewProduct({
        name: "", category: "", rate: "", quantity: "", manufacturing_date: "", expiry_date: "",
      });
      loadProducts();
    } catch {
      toast.error("Failed to create product");
    }
  }

  /* ---------------- EDIT PRODUCT ---------------- */
  async function handleEditProduct() {
    if (!editProduct || !editProduct.name || !editProduct.category || !editProduct.rate) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      await apiPut(`/products/${editProduct.id}`, {
        name: editProduct.name,
        category: editProduct.category,
        rate: Number(editProduct.rate)
      });
      toast.success("Product updated");
      setIsEditDialogOpen(false);
      loadProducts();
    } catch {
      toast.error("Failed to update product");
    }
  }

  /* ---------------- IMAGES ---------------- */
  async function loadProductImages(productId: number) {
    setLoadingImages(true);
    try {
      const data = await apiGet(`/products/${productId}/images`);
      setProductImages(data.images || []);
    } catch {
      toast.error("Failed to load images");
    } finally {
      setLoadingImages(false);
    }
  }

  /* ---------------- GLOBAL IMAGES ---------------- */
  async function loadGlobalImages() {
    setLoadingGlobalImages(true);
    try {
      const data = await apiGet(`/products/all-images`);
      setGlobalImages(data.images || []);
    } catch {
      toast.error("Failed to load global images");
    } finally {
      setLoadingGlobalImages(false);
    }
  }

  async function handleDeleteLibraryImage(filename: string) {
    if (!confirm(`Delete ${filename} from library?`)) return;
    try {
      await apiDelete(`/products/all-images/${filename}`);
      toast.success("Image deleted");
      loadGlobalImages();
    } catch {
      toast.error("Delete failed");
    }
  }

  async function handleUpdateLibraryImage(filename: string, e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("filename", filename);
    formData.append("file", file);

    try {
      toast.info("Updating image...");
      await apiPostFormData(`/products/all-images/update`, formData);
      toast.success("Image updated successfully");
      loadGlobalImages();
      loadProducts();
    } catch {
      toast.error("Update failed");
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedProduct || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    try {
      toast.info("Uploading image...");
      await apiPostFile(`/products/${selectedProduct.id}/image`, file);
      toast.success("Image uploaded successfully");
      loadProductImages(selectedProduct.id);
      loadProducts(); // Refresh master list in case main image path changed
    } catch {
      toast.error("Failed to upload image");
    }
  }

  /* ---------------- RESTOCK ---------------- */
  async function handleRestock() {
    if (!selectedProduct || !restockQty) return toast.error("Invalid quantity");

    try {
      await apiPost(`/products/restock`, {
        name: selectedProduct.name,
        category: selectedProduct.category,
        rate: selectedProduct.rate,
        quantity: Number(restockQty),
        manufacturing_date: restockMfg || null,
        expiry_date: restockExp || null,
      });

      toast.success("Stock added");
      setIsRestockDialogOpen(false);
      setSelectedProduct(null);
      setRestockQty(""); setRestockMfg(""); setRestockExp("");
      loadProducts();
    } catch {
      toast.error("Restock failed");
    }
  }

  /* ---------------- DAILY SELL ---------------- */
  function addToCart() {
    if (!sellName) return toast.error("Please enter a product name");

    let matchedProducts = products.filter(p => p.name.toLowerCase() === sellName.toLowerCase());
    if (matchedProducts.length === 0) {
      matchedProducts = products.filter(p => p.name.toLowerCase().includes(sellName.toLowerCase()));
    }

    if (matchedProducts.length === 0) return toast.error("Product not found");

    if (matchedProducts.length > 1) {
      const options = matchedProducts.map(p => ({
        id: p.id, name: p.name, category: p.category, rate: p.rate, stock: p.quantity, confidence: 1.0
      }));
      setConfirmOptions(options);
      setConfirmOpen(true);
      return;
    }

    const product = matchedProducts[0];
    const qty = sellQty ? Number(sellQty) : 1;

    if (qty <= 0) return toast.error("Invalid quantity");
    if (qty > product.quantity) return toast.error(`Insufficient stock (Available: ${product.quantity})`);

    setCart([...cart, {
      product_id: product.id, name: product.name, category: product.category,
      quantity: qty, rate: sellRate ? Number(sellRate) : product.rate,
      is_gift: isGift
    } as any]);

    setSellName(""); setSellQty(""); setSellRate(""); setIsGift(false);
    toast.success(`${product.name} added`);
  }

  function removeFromCart(index: number) {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  }

  const handleRemoveItems = (itemsToRemove: any[]) => {
    const newCart = cart.filter(cartItem => {
      const shouldRemove = itemsToRemove.some(rem => rem.name.toLowerCase() === cartItem.name.toLowerCase());
      return !shouldRemove;
    });

    if (newCart.length < cart.length) {
      toast.success(`Removed ${cart.length - newCart.length} items`);
      setCart(newCart);
    } else {
      toast.error("Item not found in cart");
    }
  };

  async function confirmSale() {
    if (!cart.length) return toast.error("Cart empty");
    try {
      await apiPost(`/sales/daily`, { user_id: currentUser.id, payment_mode: paymentMode, items: cart });
      toast.success("Sale completed");
      setCart([]); setPaymentMode("cash");
      loadProducts();
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Sale failed");
    }
  }

  /* ---------------- DELETE ---------------- */
  async function handleDeleteProduct(product: Product) {
    if (!confirm(`Are you sure you want to delete ${product.name}? This cannot be undone.`)) return;

    try {
      const params = new URLSearchParams({ name: product.name, category: product.category, rate: String(product.rate) });
      await apiDelete(`/products?${params.toString()}`);
      toast.success("Product deleted");
      loadProducts();
    } catch {
      toast.error("Failed to delete product");
    }
  }

  /* ---------------- FILTER ---------------- */
  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchArea = filterArea === "All" || p.category === filterArea;
    return matchSearch && matchArea;
  });

  const cartTotal = cart.reduce((sum, item: any) => sum + (item.is_gift ? 0 : item.rate * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  /* ================= UI ================= */
  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500 max-w-7xl mx-auto">

      {/* HEADER SECTION (GLASSMORPHIC) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/80 via-blue-900/80 to-slate-900/80 p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/30 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Box className="h-8 w-8 text-blue-400" />
              <h1 className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white tracking-tight">
                Main Vault
              </h1>
            </div>
            <p className="text-blue-200/80 text-sm sm:text-lg max-w-xl">
              Centralized master inventory mapping and daily retail operations.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Button 
              variant="outline" 
              className="bg-white/5 hover:bg-white/10 text-white border-white/20 h-10 sm:h-12 px-3 sm:px-5 rounded-xl font-bold shadow-lg transition-all hover:scale-105 text-xs sm:text-base"
              onClick={() => {
                setGlobalImageLibraryOpen(true);
                loadGlobalImages();
              }}
            >
              <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 text-purple-400" /> <span className="hidden xs:inline">Image Library</span>
            </Button>


            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-105 h-10 sm:h-12 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-base">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" /> <span className="hidden xs:inline">New Product</span><span className="xs:hidden">Add</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[500px] border border-white/20 bg-slate-900/95 backdrop-blur-3xl text-white shadow-2xl rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2"><Plus className="text-blue-400" /> New Master Product</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Name</Label>
                    <Input className="bg-white/5 border-white/10 text-white focus:border-blue-500" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-slate-300">Category</Label>
                      <Select value={newProduct.category} onValueChange={(v) => setNewProduct({ ...newProduct, category: v })}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-white/10 text-white max-h-60">
                          {AREAS.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-300">Rate (₹)</Label>
                      <Input type="number" className="bg-white/5 border-white/10 text-white focus:border-blue-500" value={newProduct.rate} onChange={(e) => setNewProduct({ ...newProduct, rate: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Initial Quantity (Optional)</Label>
                    <Input type="number" className="bg-white/5 border-white/10 text-white focus:border-blue-500" value={newProduct.quantity} onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })} />
                  </div>
                  {newProduct.quantity && Number(newProduct.quantity) > 0 && (
                    <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                      <div className="space-y-1.5">
                        <Label className="text-slate-300">MFG Date (Optional)</Label>
                        <Input type="date" className="bg-slate-900 border-white/10 text-white focus:border-blue-500 [color-scheme:dark]" value={newProduct.manufacturing_date} onChange={(e) => setNewProduct({ ...newProduct, manufacturing_date: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-300">EXP Date (Optional)</Label>
                        <Input type="date" className="bg-slate-900 border-white/10 text-white focus:border-blue-500 [color-scheme:dark]" value={newProduct.expiry_date} onChange={(e) => setNewProduct({ ...newProduct, expiry_date: e.target.value })} />
                      </div>
                    </div>
                  )}
                  <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white h-12 rounded-xl" onClick={handleAddProduct}>
                    Create Product
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* CUSTOM GLASS TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-2 custom-scrollbar">
          <TabsList className="inline-flex min-w-full sm:grid sm:grid-cols-4 bg-slate-900/50 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl h-14">
            <TabsTrigger value="products" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all h-full whitespace-nowrap px-4">
              <Package className="h-4 w-4 mr-2 hidden sm:inline" /> <span>Master Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all h-full whitespace-nowrap px-4">
              <ShoppingCart className="h-4 w-4 mr-2 hidden sm:inline" /> <span>Daily PoS</span>
            </TabsTrigger>
            <TabsTrigger value="ledger" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all h-full whitespace-nowrap px-4">
              <CalendarDays className="h-4 w-4 mr-2 hidden sm:inline" /> <span>Ledger</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all h-full whitespace-nowrap px-4">
              <TrendingUp className="h-4 w-4 mr-2 hidden sm:inline" /> <span>Import/Export</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* PRODUCTS TAB */}
        <TabsContent value="products" className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          <div className="flex flex-col sm:flex-row gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Search inventory by name..."
                className="pl-10 h-11 bg-white/5 border-white/10 text-white focus:border-blue-500 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterArea} onValueChange={setFilterArea}>
              <SelectTrigger className="w-full sm:w-[200px] h-11 bg-white/5 border-white/10 text-white rounded-xl focus:ring-blue-500">
                <SelectValue placeholder="Category filter" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-white/10 text-white max-h-60">
                <SelectItem value="All">All Categories</SelectItem>
                {AREAS.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              <div className="col-span-full py-20 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div></div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full py-20 text-center text-slate-500 italic">No products found matching criteria.</div>
            ) : filteredProducts.map((p) => (
              <div key={p.id} className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-10 group-hover:opacity-40 transition duration-500"></div>
                <div className="relative h-full bg-slate-900/80 border border-white/10 backdrop-blur-xl rounded-2xl p-5 flex flex-col hover:-translate-y-1 transition-all duration-300">

                  <div className="flex justify-between items-start mb-3">
                    <p className="font-bold text-white text-lg truncate pr-2 group-hover:text-blue-400 transition-colors" title={p.name}>{p.name}</p>
                    <Badge className={`${p.quantity <= 5 ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'} border whitespace-nowrap`}>
                      {p.quantity} In Stock
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                    <Badge variant="outline" className="text-xs text-blue-200 border-blue-500/30 bg-blue-500/10 uppercase tracking-widest px-2">{p.category}</Badge>
                    <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">₹{p.rate}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-6 bg-black/20 p-2 rounded-xl">
                    <div><span className="font-semibold text-slate-300">MFG:</span> {p.manufacturing_date || "N/A"}</div>
                    <div><span className="font-semibold text-slate-300">EXP:</span> {p.expiry_date || "N/A"}</div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-auto pt-2">
                    <Button size="sm" className="flex-1 min-w-[100px] bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-lg"
                      onClick={() => {
                        setSelectedProduct(p);
                        setIsRestockDialogOpen(true);
                      }}>
                      <Plus className="h-4 w-4 mr-1" /> Restock
                    </Button>
                    <Button size="icon" variant="outline" className="bg-white/5 hover:bg-white/10 text-emerald-300 border-white/10 rounded-lg"
                      onClick={() => {
                        setEditProduct({...p});
                        setIsEditDialogOpen(true);
                      }} title="Edit Product">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="bg-white/5 hover:bg-white/10 text-purple-300 border-white/10 rounded-lg"
                      onClick={() => {
                        setSelectedProduct(p);
                        setIsImageDialogOpen(true);
                        loadProductImages(p.id);
                      }} title="Manage Images">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="bg-white/5 hover:bg-white/10 text-blue-300 border-white/10 rounded-lg"
                      onClick={() => {
                        setSelectedProduct(p);
                        setIsViewDialogOpen(true);
                        loadStockHistory(p.name, p.category);
                      }} title="View Ledger">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="destructive" className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 border border-rose-500/30 hover:text-white rounded-lg"
                      onClick={() => handleDeleteProduct(p)} title="Delete Product">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* DAILY POINT OF SALE TAB */}
        <TabsContent value="sell" className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[700px]">

            {/* Left Column: POS Entry */}
            <Card className="lg:col-span-8 bg-slate-900/90 border border-white/10 backdrop-blur-xl rounded-3xl shadow-xl flex flex-col overflow-hidden relative">
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
              <CardHeader className="bg-white/5 border-b border-white/10 pb-4">
                <CardTitle className="text-2xl font-bold flex items-center gap-2 text-white"><ShoppingCart className="text-teal-400" /> Daily Point of Sale</CardTitle>
              </CardHeader>

              <CardContent className="p-6 flex-1 flex flex-col space-y-6">
                {/* Input Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <Input placeholder="Scan or type item name..." className="h-12 pl-10 bg-black/40 border-white/10 text-white rounded-xl focus:border-emerald-500 text-lg" value={sellName} onChange={(e) => setSellName(e.target.value)} />
                  </div>
                  <Input type="number" placeholder="₹ Rate" className="h-12 w-24 bg-black/40 border-white/10 text-emerald-300 rounded-xl focus:border-emerald-500 text-center text-lg font-bold" value={sellRate} onChange={(e) => setSellRate(e.target.value)} title="Override Rate (Optional)" />
                  <Input type="number" placeholder="Qty" className="h-12 w-24 bg-black/40 border-white/10 text-white rounded-xl focus:border-emerald-500 text-center text-lg font-bold" value={sellQty} onChange={(e) => setSellQty(e.target.value)} />
                  <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-white/10 px-3 rounded-xl hover:bg-white/10 transition-colors">
                    <input type="checkbox" className="w-5 h-5 accent-emerald-500" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} />
                    <span className="text-white font-bold">🎁</span>
                  </label>
                  <Button onClick={addToCart} className="h-12 px-8 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-lg font-bold shadow-lg shadow-emerald-500/20">Add</Button>
                </div>

                {/* Automation Box */}
                <div className="bg-black/20 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex-1 w-full">
                    <AISpeech
                      context="daily_sell" userId={currentUser.id}
                      onFill={(data: any) => {
                        if (data?.name) setSellName(data.name);
                        if (data?.quantity) setSellQty(String(data.quantity));
                        if (data?.rate) setSellRate(String(data.rate));
                      }}
                      onAddItems={(items) => {
                        const newItems = items.map(i => ({ product_id: i.id, name: i.name, category: i.category, quantity: i.quantity, rate: i.rate }));
                        setCart(prev => [...prev, ...newItems]);
                      }}
                      onRemoveItems={handleRemoveItems}
                      onAmbiguity={(ambiguities) => { if (ambiguities.length > 0) { setConfirmOptions(ambiguities[0].options); setConfirmOpen(true); } }}
                      onSuccess={() => loadProducts()}
                    />
                  </div>
                  <div className="flex-1 w-full h-12 flex border border-white/10 rounded-xl bg-white/5 overflow-hidden">
                    <CameraScan
                      onAutoMatch={(product: any) => { setSellName(product.name); setSellRate(String(product.rate)); }}
                      onConfirmMatch={(options: any[]) => { setConfirmOptions(options); setConfirmOpen(true); }}
                    />
                  </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto bg-black/10 border border-white/5 rounded-2xl p-4 custom-scrollbar">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500/50">
                      <ShoppingCart className="h-16 w-16 mb-4" />
                      <p className="text-xl font-bold">Cart is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((c, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-colors">
                          <div className="flex-1 pr-4">
                            <p className="font-bold text-white text-lg">{(c as any).name} {(c as any).is_gift && <Badge className="ml-2 bg-purple-500/20 text-purple-300 border-0 text-sm">🎁 Gift</Badge>}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-slate-800 text-slate-300 border-white/5 text-xs">Qty: {c.quantity}</Badge>
                              <span className="text-slate-500 text-sm">× ₹{c.rate}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`font-black text-xl ${(c as any).is_gift ? 'text-slate-500 line-through' : 'text-teal-400'}`}>₹{(c.rate * c.quantity).toLocaleString()}</span>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-400 hover:text-white hover:bg-rose-500/80 rounded-lg" onClick={() => removeFromCart(i)}>
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Checkout */}
            <Card className="lg:col-span-4 bg-slate-900/95 border border-white/10 backdrop-blur-3xl rounded-3xl shadow-2xl flex flex-col relative overflow-hidden h-fit lg:h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full blur-2xl -z-10"></div>
              <CardHeader className="bg-white/5 border-b border-white/10">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">Checkout Summary</CardTitle>
              </CardHeader>

              <CardContent className="flex-1 p-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="bg-black/30 p-6 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex justify-between text-slate-300">
                      <span>Items:</span>
                      <span className="font-bold text-white">{cartItemCount}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Subtotal:</span>
                      <span className="font-bold text-white">₹{cartTotal.toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-white/10 w-full my-2"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg text-white font-bold uppercase tracking-widest">Total</span>
                      <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                        ₹{cartTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="uppercase tracking-widest text-xs font-bold text-slate-400">Payment Method</Label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-14 rounded-xl text-lg pl-4 focus:ring-emerald-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-white/10 text-white">
                        <SelectItem value="cash"><div className="flex items-center gap-3 text-base"><Banknote className="h-5 w-5 text-emerald-400" /> Cash Received</div></SelectItem>
                        <SelectItem value="online"><div className="flex items-center gap-3 text-base"><CreditCard className="h-5 w-5 text-blue-400" /> Online / UPI</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xl font-bold shadow-[0_0_30px_rgba(16,185,129,0.3)] border-0 mt-8"
                  onClick={confirmSale} disabled={cart.length === 0}
                >
                  <CheckCircle2 className="h-6 w-6 mr-3" /> Complete Retail Sale
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MONTHLY LEDGER TAB */}
        <TabsContent value="ledger" className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="bg-slate-900/90 border border-white/10 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/10 flex flex-row items-center justify-between py-5">
              <CardTitle className="text-2xl font-bold flex items-center gap-2 text-white">
                <CalendarDays className="text-indigo-400" /> Monthly Operations Ledger
              </CardTitle>
              <div className="flex gap-3">
                <Select value={String(ledgerMonth)} onValueChange={(val) => setLedgerMonth(parseInt(val))}>
                   <SelectTrigger className="w-32 bg-slate-800 border-white/10 text-white"><SelectValue/></SelectTrigger>
                   <SelectContent className="bg-slate-800 text-white border-white/10">
                     {Array.from({length: 12}).map((_, i) => (
                       <SelectItem key={i+1} value={String(i+1)}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</SelectItem>
                     ))}
                   </SelectContent>
                </Select>
                <Select value={String(ledgerYear)} onValueChange={(val) => setLedgerYear(parseInt(val))}>
                   <SelectTrigger className="w-24 bg-slate-800 border-white/10 text-white"><SelectValue/></SelectTrigger>
                   <SelectContent className="bg-slate-800 text-white border-white/10">
                     {[2024, 2025, 2026].map(y => (
                       <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                     ))}
                   </SelectContent>
                </Select>
                <Button variant="outline" className="border-white/10 text-slate-300 hover:text-white" onClick={loadMonthlySales}>Refresh</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                 <table className="w-full text-left border-collapse min-w-[800px]">
                   <thead>
                     <tr className="bg-black/40 border-b border-white/10 text-slate-300 text-sm uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                       <th className="p-4 font-bold">Date & Time</th>
                       <th className="p-4 font-bold">Item Identifier</th>
                       <th className="p-4 font-bold">Category</th>
                       <th className="p-4 font-bold text-center">Volume</th>
                       <th className="p-4 font-bold text-right">Value (₹)</th>
                       <th className="p-4 font-bold text-right">Payment</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {monthlySales.length === 0 ? (
                       <tr><td colSpan={6} className="text-center py-12 text-slate-500 font-medium">No sales recorded for this period.</td></tr>
                     ) : (
                        monthlySales.map((sale: any, idx: number) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="p-4">
                              <span className="font-mono text-sm text-slate-300">{new Date(sale.date).toLocaleDateString()}</span>
                              <span className="text-xs text-slate-500 ml-2">{new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </td>
                            <td className="p-4 font-bold text-white max-w-[200px] truncate">{sale.product_name}</td>
                            <td className="p-4"><Badge variant="outline" className="text-indigo-300 border-indigo-500/30 uppercase text-[10px]">{sale.category}</Badge></td>
                            <td className="p-4 text-center font-bold text-slate-200">{sale.quantity}</td>
                            <td className="p-4 text-right font-black text-emerald-400">{(sale.total_price || sale.quantity * sale.rate).toLocaleString()}</td>
                            <td className="p-4 text-right">
                              <Badge className={`uppercase text-[10px] bg-transparent border ${sale.payment_mode === 'cash' ? 'text-emerald-400 border-emerald-500/50' : 'text-blue-400 border-blue-500/50'}`}>
                                {sale.payment_mode}
                              </Badge>
                            </td>
                          </tr>
                        ))
                     )}
                   </tbody>
                 </table>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IMPORT EXPORT TAB */}
        <TabsContent value="import" className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="bg-slate-900/80 border border-white/10 backdrop-blur-xl rounded-3xl max-w-3xl mx-auto shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -z-10"></div>
            <CardContent className="p-12 text-center space-y-8">
              <div className="mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/20">
                  <TrendingUp className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Bulk Operations</h2>
                <p className="text-slate-400">Import or export your entire master inventory catalog seamlessly.</p>
              </div>

              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => e.target.files && handleImportExcel(e.target.files[0])} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/20 p-8 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group" onClick={openFilePicker}>
                  <Upload className="h-12 w-12 text-purple-400 mx-auto mb-4 group-hover:-translate-y-2 transition-transform" />
                  <h3 className="text-xl font-bold text-white mb-2">Import Inventory</h3>
                  <p className="text-sm text-slate-400">Upload a spreadsheet to bulk-create or update items.</p>
                </div>
                <div className="bg-black/20 p-8 rounded-2xl border border-white/5 hover:border-pink-500/30 transition-all cursor-pointer group" onClick={handleExportExcel}>
                  <Download className="h-12 w-12 text-pink-400 mx-auto mb-4 group-hover:translate-y-2 transition-transform" />
                  <h3 className="text-xl font-bold text-white mb-2">Export Catalog</h3>
                  <p className="text-sm text-slate-400">Download the complete master inventory as XLSX.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* VIEW PRODUCT DETAILS DIALOG */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl bg-slate-900/95 border border-white/20 text-white backdrop-blur-3xl rounded-3xl shadow-2xl overflow-hidden">
          <DialogHeader className="p-6 border-b border-white/10 bg-white/5">
            <DialogTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white">{selectedProduct?.name} – Stock Ledger</DialogTitle>
          </DialogHeader>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Category</p>
                <p className="font-bold text-white bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded w-fit">{selectedProduct?.category}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Current Qty</p>
                <p className="font-bold text-2xl text-white">{selectedProduct?.quantity}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Standard Rate</p>
                <p className="font-bold text-2xl text-emerald-400">₹{selectedProduct?.rate}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Listing Status</p>
                <p className="font-bold text-white">{selectedProduct?.is_active ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Active</span> : <span className="text-rose-400">Inactive</span>}</p>
              </div>
            </div>

            <h3 className="font-bold text-lg text-slate-200 mb-4 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-indigo-400" /> Restock History</h3>

            {loadingHistory ? (
              <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>
            ) : stockHistory.length === 0 ? (
              <div className="py-8 text-center bg-black/20 rounded-xl border border-white/5 text-slate-500 italic">No restock records found for this item.</div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-white/10">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/10 text-slate-300 uppercase tracking-wider text-xs font-bold">
                    <tr>
                      <th className="p-3">Log Date</th>
                      <th className="p-3 text-right">Units Added</th>
                      <th className="p-3">MFG Date</th>
                      <th className="p-3">EXP Date</th>
                      <th className="p-3">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-black/20">
                    {stockHistory.map((s) => (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-slate-300">{new Date(s.created_at).toLocaleDateString()}</td>
                        <td className="p-3 text-right font-black text-emerald-400">+{s.quantity}</td>
                        <td className="p-3 text-slate-400">{s.manufacturing_date || '-'}</td>
                        <td className="p-3 text-slate-400">{s.expiry_date || '-'}</td>
                        <td className="p-3 font-medium text-slate-300">{s.restocked_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* RESTOCK DIALOG */}
      <Dialog open={isRestockDialogOpen} onOpenChange={setIsRestockDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-slate-900/95 border border-white/20 text-white backdrop-blur-3xl rounded-2xl shadow-2xl">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2"><Plus className="text-blue-400" /> Log New Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl mb-4 text-center">
              <p className="text-sm text-blue-200">Updating inventory for</p>
              <p className="text-lg font-bold text-white">{selectedProduct?.name}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Units Arrived</Label>
              <Input type="number" className="bg-white/5 border-white/10 text-white focus:border-blue-500 text-lg font-bold" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Manufacturing Date (Optional)</Label>
                <Input type="date" className="bg-white/5 border-white/10 text-white focus:border-blue-500 [color-scheme:dark]" value={restockMfg} onChange={(e) => setRestockMfg(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Expiry Date (Optional)</Label>
                <Input type="date" className="bg-white/5 border-white/10 text-white focus:border-blue-500 [color-scheme:dark]" value={restockExp} onChange={(e) => setRestockExp(e.target.value)} />
              </div>
            </div>
            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white h-12 rounded-xl text-lg font-bold" onClick={handleRestock}>Commit to Ledger</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border border-white/20 bg-slate-900/95 backdrop-blur-3xl text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2"><Edit2 className="text-emerald-400 h-5 w-5" /> Edit Product</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Name</Label>
                <Input className="bg-white/5 border-white/10 text-white focus:border-emerald-500" value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Category</Label>
                  <Select value={editProduct.category} onValueChange={(v) => setEditProduct({ ...editProduct, category: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-emerald-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10 text-white max-h-60">
                      {AREAS.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Rate (₹)</Label>
                  <Input type="number" className="bg-white/5 border-white/10 text-white focus:border-emerald-500" value={editProduct.rate} onChange={(e) => setEditProduct({ ...editProduct, rate: Number(e.target.value) })} />
                </div>
              </div>
              <Button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white h-12 rounded-xl" onClick={handleEditProduct}>
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* IMAGES DIALOG */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-slate-900/95 border border-white/20 text-white backdrop-blur-3xl rounded-3xl shadow-2xl">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2"><ImageIcon className="text-purple-400 h-6 w-6" /> Manage Images: {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between bg-black/20 p-4 rounded-2xl border border-white/5">
              <div>
                <h4 className="font-bold text-white mb-1">Upload New Packaging/Variant Image</h4>
                <p className="text-xs text-slate-400 max-w-sm">Upload a clear photo. This updates OCR recognition and stores history.</p>
              </div>
              <label className="cursor-pointer bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl text-white font-bold flex items-center gap-2 transition-colors">
                <Upload className="h-4 w-4" /> Upload
                <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
              </label>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-300 mb-4 flex items-center gap-2">Image History</h4>
              {loadingImages ? (
                <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div></div>
              ) : productImages.length === 0 ? (
                <div className="text-center py-8 text-slate-500 italic bg-black/20 rounded-xl border border-white/5">No images uploaded for this product yet.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                  {productImages.map((imgPath, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-white/10 aspect-square bg-black/40">
                      <img src={import.meta.env.VITE_API_BASE_URL + imgPath} alt={`${selectedProduct?.name} ver ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      {idx === 0 && (
                        <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">LATEST</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* GLOBAL IMAGE LIBRARY DIALOG */}
      <Dialog open={globalImageLibraryOpen} onOpenChange={setGlobalImageLibraryOpen}>
        <DialogContent className="sm:max-w-[700px] bg-slate-900/95 border border-white/20 text-white backdrop-blur-3xl rounded-3xl shadow-2xl">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <ImageIcon className="text-purple-400 h-6 w-6" /> Image Library
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-slate-400 text-sm">All uploaded product images in the system folder.</p>
            {loadingGlobalImages ? (
              <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div></div>
            ) : globalImages.length === 0 ? (
              <div className="text-center py-8 text-slate-500 italic bg-black/20 rounded-xl border border-white/5">No images found in the library.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar p-1">
                {globalImages.map((img, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-white/10 flex flex-col bg-black/40">
                    <div className="aspect-square w-full overflow-hidden relative">
                      <img src={import.meta.env.VITE_API_BASE_URL + img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      
                      {/* Action Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                         <label className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full cursor-pointer transition-transform hover:scale-110" title="Update/Replace">
                            <Upload className="h-4 w-4 text-white" />
                            <input type="file" accept="image/*" hidden onChange={(e) => handleUpdateLibraryImage(img.name, e)} />
                         </label>
                         <button 
                            className="p-2 bg-rose-600 hover:bg-rose-500 rounded-full transition-transform hover:scale-110" 
                            title="Delete"
                            onClick={() => handleDeleteLibraryImage(img.name)}
                         >
                            <Trash2 className="h-4 w-4 text-white" />
                         </button>
                      </div>
                    </div>
                    <div className="p-2 truncate text-[10px] text-slate-400 text-center bg-white/5 border-t border-white/5" title={img.name}>
                      {img.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CAMERA SCANN CONFIRMATION */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-slate-900 border border-white/20 text-white sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2"><Sparkles className="text-teal-400" /> Suggestion Match</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {confirmOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center justify-between border border-white/10 bg-white/5 p-4 rounded-xl hover:bg-white/10 hover:border-teal-500/50 cursor-pointer transition-all"
                onClick={() => {
                  const qty = sellQty ? Number(sellQty) : 1;
                  setCart(prev => [...prev, {
                    product_id: opt.id, name: opt.name, category: opt.category,
                    quantity: qty, rate: opt.rate
                  }]);
                  toast.success(`${opt.name} added to cart`);

                  // Clear search input states so UI doesn't look messy, but keep dialog openly active
                  setSellName(""); setSellRate(""); setSellQty("");
                }}>
                <div>
                  <p className="font-bold text-lg">{opt.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{opt.confidence ? `Match: ${Math.round(opt.confidence * 100)}%` : `Qty Avail: ${opt.stock}`}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-xl text-emerald-400">₹{opt.rate}</p>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 border-0 text-white font-bold hover:from-teal-500 hover:to-emerald-500 mt-2" onClick={() => setConfirmOpen(false)}>Done / Close</Button>
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
