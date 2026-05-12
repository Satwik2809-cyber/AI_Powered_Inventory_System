import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Users,
  Package,
  DollarSign,
  Download,
  CheckCircle,
  PlayCircle,
  Lock,
  AlertTriangle,
  History
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { apiGet, apiPost } from "../api";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

/* ================= REPORTS ================= */

export default function Reports() {
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState(
    now.getMonth().toString()
  );
  const [selectedYear, setSelectedYear] = useState(
    now.getFullYear().toString()
  );

  const [reportTab, setReportTab] = useState<
    "daily" | "events" | "monthly" | "counting"
  >("daily");

  const [summary, setSummary] = useState<any>(null);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [eventsReport, setEventsReport] = useState<any[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // New State for Monthly Workflow
  const [monthlyStatus, setMonthlyStatus] = useState<"none" | "counting">("none");
  const [draftReport, setDraftReport] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);

  /* ================= FETCH DATA ================= */

  // Load Status & Summary
  useEffect(() => {
    loadStatus();
    loadSummary();
  }, []);

  async function loadStatus() {
    try {
      const res = await apiGet("/reports/monthly/status");
      if (res.status === "counting") {
        setMonthlyStatus("counting");
        setReportTab("counting"); // Auto switch
        loadDraft();
      } else {
        setMonthlyStatus("none");
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadSummary() {
    try {
      const data = await apiGet("/reports/summary");
      setSummary(data);
    } catch {
      toast.error("Failed to load summary");
    }
  }

  async function loadDraft() {
    try {
      const data = await apiGet("/reports/monthly/draft");
      setDraftReport(data);
    } catch {
      toast.error("Failed to load draft report");
    }
  }

  // Load Daily Sales
  useEffect(() => {
    if (reportTab === "daily") {
      async function loadDaily() {
        try {
          const data = await apiGet("/reports/daily");
          setDailySales(data);
        } catch {
          toast.error("Failed to load daily sales");
        }
      }
      loadDaily();
    }
  }, [reportTab]);

  // Load Events Report
  useEffect(() => {
    if (reportTab === "events") {
      async function loadEvents() {
        try {
          const data = await apiGet("/reports/events");
          setEventsReport(data);
        } catch {
          toast.error("Failed to load events report");
        }
      }
      loadEvents();
    }
  }, [reportTab]);


  // Load Monthly Report (History)
  useEffect(() => {
    if (reportTab === "monthly") {
      // ... (Logic to load history/previous months if needed, or just specific month)
      // For now let's keep the specific month logic
      async function loadMonthly() {
        setLoading(true);
        try {
          const data = await apiGet(
            `/reports/monthly?month=${selectedMonth}&year=${selectedYear}`
          );
          setMonthlyReport(data);
        } catch {
          // toast.error("Failed to load monthly report"); 
          // Might 404 if not exists, ignore
          setMonthlyReport(null);
        } finally {
          setLoading(false);
        }
      }
      loadMonthly();
    }
  }, [reportTab, selectedMonth, selectedYear]);

  /* ================= ACTIONS ================= */

  async function startMonthlyCount() {
    const monthName = months[parseInt(selectedMonth)];
    if (!confirm(`Start Monthly Count for ${monthName} ${selectedYear}? This will pause/redirect sales to this period.`)) return;
    try {
      await apiPost("/reports/monthly/start", { 
        month: parseInt(selectedMonth), 
        year: parseInt(selectedYear) 
      });
      toast.success(`Monthly Count Started for ${monthName}`);
      loadStatus();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to start count");
    }
  }

  async function finalizeCount() {
    if (!confirm("Finalize and Lock this Month? This cannot be undone.")) return;
    try {
      setConfirming(true);
      await apiPost("/reports/monthly/finalize", {});
      toast.success("Month Finalized Successfully! ✅");
      setMonthlyStatus("none");
      setReportTab("monthly"); // Go to history/view
      setDraftReport(null);
      loadSummary(); // Refresh stats
    } catch {
      toast.error("Failed to finalize");
    } finally {
      setConfirming(false);
    }
  }

  async function cancelCount() {
    if (!confirm("Cancel the Active Monthly Count? This deletes the draft completely.")) return;
    try {
      await apiPost("/reports/monthly/cancel", {});
      toast.success("Monthly Count Cancelled");
      setMonthlyStatus("none");
      setReportTab("monthly");
      setDraftReport(null);
      loadSummary();
    } catch {
      toast.error("Failed to cancel count");
    }
  }

    toast.success("Report Exported to CSV");
  }

  async function exportToExcel(twoSheets: boolean = false) {
    try {
      const filename = `Monthly_Report_${selectedYear}_${parseInt(selectedMonth)+1}${twoSheets ? '_Detailed' : ''}.xlsx`;
      const url = `/reports/monthly/export/excel?month=${selectedMonth}&year=${selectedYear}&two_sheets=${twoSheets}`;
      
      toast.info("Preparing Excel Download...");
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${url}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Export failed");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(link);
      
      toast.success("Excel Export Successful");
    } catch (err: any) {
      toast.error(err.message || "Failed to export Excel");
    }
  }

  /* ================= VALUES ================= */

  const months = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December",
  ];

  const years = Array.from({ length: 5 }, (_, i) =>
    (now.getFullYear() - i).toString()
  );

  /* ================= UI ================= */

  return (
    <div className="space-y-6 h-full flex flex-col">

      {/* HEADER SECTION (GLASSMORPHIC) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/80 via-blue-900/80 to-slate-900/80 p-8 shadow-2xl border border-white/10 backdrop-blur-xl flex-shrink-0">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/30 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-8 w-8 text-blue-400" />
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white tracking-tight">
                Reports & Analytics
              </h1>
            </div>
            <p className="text-blue-200/80 text-lg max-w-xl">
              Sales & performance overview
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {monthlyStatus === "none" && (
              <Button onClick={startMonthlyCount} className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold h-12 shadow-lg shadow-indigo-500/25 border-0 rounded-xl px-6">
                <PlayCircle className="mr-2 h-5 w-5" />
                Start {months[parseInt(selectedMonth)]} Count
              </Button>
            )}

            <div className="flex gap-2">
              <Button onClick={() => exportToExcel(false)} className="bg-white/10 hover:bg-white/20 text-white border border-white/10 h-12 rounded-xl px-4 backdrop-blur-md text-sm">
                <Download className="h-4 w-4 mr-2" />
                Monthly History
              </Button>
              <Button onClick={() => exportToExcel(true)} className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 h-12 rounded-xl px-4 backdrop-blur-md text-sm">
                <Download className="h-4 w-4 mr-2" />
                Last Two Sheets
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* COUNTING BANNER */}
      {monthlyStatus === "counting" && (
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 p-6 rounded-2xl shadow-lg backdrop-blur-md flex-shrink-0 flex items-center gap-4">
          <div className="bg-amber-500/20 p-3 rounded-full">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <p className="font-extrabold text-amber-500 text-lg uppercase tracking-tight">Monthly Counting in Progress</p>
            <p className="text-sm text-amber-500/80">
              Sales are currently being attributed to the next period.
              Please review the draft report below and finalize when ready.
            </p>
          </div>
        </div>
      )}

      {/* STATS */}
      <div className="grid md:grid-cols-4 gap-4 flex-shrink-0">
        <Stat title="Total Revenue" value={`₹${summary?.total_revenue || 0}`} icon={<DollarSign />} />
        <Stat title="Today's Revenue" value={`₹${summary?.today_revenue || 0}`} icon={<TrendingUp />} />
        <Stat title="Events" value={summary?.events_count || 0} icon={<Calendar />} />
        <Stat title="Inventory Items" value={summary?.items_count || 0} icon={<Package />} />
      </div>

      {/* TABS */}
      <Tabs value={reportTab} onValueChange={(v: any) => setReportTab(v)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-4 flex-shrink-0 bg-slate-900/50 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl h-14 w-full">
          <TabsTrigger value="daily" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all">Daily Sell</TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all">Events</TabsTrigger>
          <TabsTrigger value="monthly" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all">History</TabsTrigger>

          {monthlyStatus === "counting" && (
            <TabsTrigger value="counting" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all text-amber-500 border border-amber-500/30">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Current Draft
            </TabsTrigger>
          )}
        </TabsList>

        {/* DAILY */}
        <TabsContent value="daily" className="flex-1 min-h-0 overflow-hidden">
          <SimpleList
            title="Daily Sales"
            empty="No daily sales"
            rows={dailySales}
          />
        </TabsContent>

        {/* EVENTS */}
        <TabsContent value="events" className="flex-1 min-h-0 overflow-hidden">
          {/* Map event structure to SimpleList row structure */}
          <SimpleList
            title="Event Sales"
            empty="No event sales"
            rows={eventsReport.map(e => ({
              title: e.name,
              subtitle: `${e.count} transactions • ${e.status}`,
              value: `₹${e.revenue}`
            }))}
          />
        </TabsContent>

        {/* MONTHLY HISTORY */}
        <TabsContent value="monthly" className="flex-1 min-h-[0] flex flex-col space-y-4">
          <div className="shrink-0">
            <MonthSelector
              month={selectedMonth}
              year={selectedYear}
              setMonth={setSelectedMonth}
              setYear={setSelectedYear}
              months={months}
              years={years}
            />
          </div>

          <div className="flex-1 min-h-[0] overflow-hidden">
            <Card className="h-full flex flex-col border-0 bg-white/60 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -z-10 opacity-70 translate-x-1/2 -translate-y-1/2" />
              <CardHeader className="shrink-0 border-b border-gray-100 pb-4">
                <CardTitle className="flex justify-between items-center text-gray-800">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-indigo-500" />
                    Archive: {months[parseInt(selectedMonth)]} {selectedYear}
                  </div>
                  {!monthlyReport ? (
                    <Badge variant="outline" className="text-gray-400 border-gray-200">No Data Available</Badge>
                  ) : (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 shadow-sm">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Locked & Confirmed
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 min-h-[0] flex flex-col p-0">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  monthlyReport ? (
                    <div className="flex flex-col h-full bg-gray-50/30">
                      {/* STATS HEADER */}
                      <div className="grid grid-cols-4 gap-px bg-gray-100 shrink-0">
                        <div className="bg-white p-6 col-span-2">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Revenue</p>
                          <p className="text-4xl font-black text-indigo-600">
                            ₹{monthlyReport.revenue}
                          </p>
                        </div>
                        <div className="bg-white p-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Daily Cash</p>
                          <p className="text-2xl font-bold text-gray-700">₹{monthlyReport.breakdown?.daily_cash || 0}</p>
                        </div>
                        <div className="bg-white p-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Daily Online</p>
                          <p className="text-2xl font-bold text-gray-700">₹{monthlyReport.breakdown?.daily_online || 0}</p>
                        </div>
                      </div>

                      <div className="px-6 py-2 bg-white flex justify-between items-center border-b border-gray-100 shrink-0">
                        <p className="text-xs text-gray-400 font-medium">
                          Period: {monthlyReport.period}
                        </p>
                        {monthlyReport.inventory_snapshot && monthlyReport.inventory_snapshot.length > 0 && (
                          <p className="text-xs text-indigo-500 font-medium">
                            Snapshot Value: ₹{monthlyReport.inventory_snapshot.reduce((acc: number, item: any) => acc + item.value, 0)}
                          </p>
                        )}
                      </div>

                      {/* DETAILED BREAKDOWN in History (Now scrollable) */}
                      {monthlyReport.breakdown && monthlyReport.breakdown.breakdown && (
                        <div className="flex-1 min-h-[0] overflow-y-auto p-6 custom-scrollbar">
                          <h3 className="font-semibold text-gray-700 mb-4">Detailed Breakdown</h3>
                          <div className="space-y-4">
                            {monthlyReport.breakdown.breakdown.map((userStats: any, i: number) => (
                              <div key={i} className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                                <div className="flex justify-between items-center p-3 bg-gray-50 border-b border-gray-100">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-gray-700">{userStats.user}</p>
                                  </div>
                                  <Badge variant="outline" className="bg-white text-gray-600 font-bold">Total: ₹{userStats.total_user_sales}</Badge>
                                </div>
                                <div className="p-0">
                                  <Table>
                                    <TableHeader className="bg-gray-50/30">
                                      <TableRow className="hover:bg-transparent">
                                        <TableHead className="h-8 text-xs">Product</TableHead>
                                        <TableHead className="h-8 text-xs text-right">Qty</TableHead>
                                        <TableHead className="h-8 text-xs text-right">Amount</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {userStats.products.map((p: any, j: number) => (
                                        <TableRow key={j} className="hover:bg-transparent border-b-gray-50">
                                          <TableCell className="py-2 text-sm text-gray-600">{p.name}</TableCell>
                                          <TableCell className="py-2 text-sm text-gray-600 text-right">{p.qty}</TableCell>
                                          <TableCell className="py-2 text-sm font-semibold text-gray-700 text-right">₹{p.amount}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* DAILY SALES LOG */}
                      {monthlyReport.breakdown && monthlyReport.breakdown.daily_sales_log && monthlyReport.breakdown.daily_sales_log.length > 0 && (
                        <div className="flex-1 min-h-[0] overflow-y-auto p-6 custom-scrollbar border-t border-gray-100">
                          <h3 className="font-semibold text-gray-700 mb-4">Daily Sales Log</h3>
                          <div className="space-y-4">
                            {monthlyReport.breakdown.daily_sales_log.map((dayLog: any, i: number) => (
                              <div key={i} className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                                <div className="flex justify-between items-center p-3 bg-indigo-50/50 border-b border-gray-100">
                                  <p className="font-bold text-gray-700">{dayLog.date}</p>
                                  <Badge className="bg-indigo-500">Total: ₹{dayLog.total}</Badge>
                                </div>
                                <div className="p-0">
                                  <Table>
                                    <TableBody>
                                      {dayLog.items.map((item: any, j: number) => (
                                        <TableRow key={j} className="hover:bg-transparent border-b-gray-50">
                                          <TableCell className="py-2 text-sm text-gray-600 font-medium">{item.name}</TableCell>
                                          <TableCell className="py-2 text-sm text-gray-600 text-right">{item.qty}</TableCell>
                                          <TableCell className="py-2 text-sm font-semibold text-gray-800 text-right">₹{item.amount}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TRANSACTION LOG */}
                      {monthlyReport.breakdown && monthlyReport.breakdown.transaction_log && monthlyReport.breakdown.transaction_log.length > 0 && (
                        <div className="flex-1 min-h-[0] overflow-y-auto p-6 custom-scrollbar border-t border-gray-100">
                          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><History className="w-5 h-5 text-indigo-500" /> Transaction Log</h3>
                          <div className="space-y-3">
                            {monthlyReport.breakdown.transaction_log.map((tx: any, i: number) => (
                              <div key={i} className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-2 hover:shadow-md transition-shadow">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className={tx.type === 'Event' ? 'text-purple-600 border-purple-200' : 'text-emerald-600 border-emerald-200'}>{tx.type}</Badge>
                                    <span className="font-bold text-gray-700">{tx.date} {tx.time}</span>
                                  </div>
                                  <p className="text-sm text-gray-500 max-w-xl">{tx.items_str}</p>
                                </div>
                                <div className="text-left sm:text-right shrink-0">
                                  <p className="text-lg font-black text-indigo-600">₹{tx.total}</p>
                                  <div className="flex gap-2 text-xs font-medium sm:justify-end mt-1">
                                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Cash: ₹{tx.cash}</span>
                                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Online: ₹{tx.online}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* RESTOCKING HISTORY */}
                      {monthlyReport.breakdown && monthlyReport.breakdown.restock_history && monthlyReport.breakdown.restock_history.length > 0 && (
                        <div className="px-6 pb-6 shrink-0 max-h-48 overflow-y-auto custom-scrollbar border-t border-gray-100 pt-4">
                          <h3 className="font-semibold text-gray-700 mb-3">Restocking History</h3>
                          <div className="space-y-2">
                            {monthlyReport.breakdown.restock_history.map((h: any, i: number) => (
                              <div key={i} className="flex justify-between items-center text-sm p-2 bg-white border border-gray-100 rounded-lg">
                                <div><span className="font-bold">{h.product_name}</span> <span className="text-gray-400 mx-2">•</span> <span className="text-gray-500">{h.restocked_by}</span> <span className="text-gray-400 mx-2">•</span> <span className="text-xs text-gray-400">{h.date}</span></div>
                                <Badge className="bg-emerald-500">+{h.quantity}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                      <History className="h-12 w-12 opacity-20" />
                      <p>No monthly report found for this period.</p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* COUNTING DRAFT VIEW */}
        <TabsContent value="counting" className="flex-1 min-h-[0] flex flex-col space-y-4">
          {draftReport ? (
            <div className="flex-1 min-h-[0] flex flex-col space-y-4">
              <Card className="flex-1 min-h-[0] flex flex-col border-0 bg-white/60 backdrop-blur-xl shadow-2xl relative overflow-hidden rounded-2xl">
                {/* Custom Gradient Background / Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-100/40 via-transparent to-amber-100/40 pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 animate-pulse" />

                <CardHeader className="relative z-10 shrink-0 pb-2 border-b border-amber-100/50">
                  <CardTitle className="flex items-center text-amber-900">
                    <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
                    Interactive Draft Report Review
                  </CardTitle>
                </CardHeader>

                <CardContent className="relative z-10 flex-1 min-h-[0] flex flex-col p-6 space-y-6 overflow-hidden">

                  {/* REVENUE ROW */}
                  <div className="grid grid-cols-3 gap-4 shrink-0">
                    <div className="grid grid-cols-2 gap-2">
                      <StatBox label="Cash Sales" value={`₹${draftReport.revenue.daily_cash}`} />
                      <StatBox label="Online Sales" value={`₹${draftReport.revenue.daily_online}`} />
                    </div>
                    <StatBox label="Event Sales" value={`₹${draftReport.revenue.event_sales}`} />
                    <div className="p-4 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-inner">
                      <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Total Revenue</p>
                      <p className="text-2xl font-black text-indigo-900 mt-1">₹{draftReport.revenue.total}</p>
                    </div>
                  </div>

                  {/* INVENTORY SNAPSHOT / HEADER for BREAKDOWN */}
                  <div className="flex justify-between items-end shrink-0">
                    <div>
                      <h3 className="font-semibold text-gray-700">Detailed Sales Breakdown</h3>
                      <p className="text-sm text-gray-500">Sales tracked during this period</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Inventory Snapshot</p>
                      <p className="text-xl font-bold text-gray-800">₹{draftReport.breakdown.inventory_value}</p>
                    </div>
                  </div>

                  {/* SCROLLABLE BREAKDOWN LIST */}
                  <div className="flex-1 min-h-[0] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="space-y-4">
                      {draftReport.breakdown.detailed_sales ? (
                        draftReport.breakdown.detailed_sales.map((userStats: any, i: number) => (
                          <div key={i} className="bg-white/80 border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-center p-3 bg-gray-50/80 border-b border-gray-100">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                  {userStats.user.charAt(0).toUpperCase()}
                                </div>
                                <p className="font-bold text-gray-800">{userStats.user}</p>
                              </div>
                              <Badge className="bg-indigo-600">Total: ₹{userStats.total_user_sales}</Badge>
                            </div>
                            <div className="p-0">
                              <Table>
                                <TableHeader className="bg-gray-50/50">
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="h-8 text-xs font-semibold">Product</TableHead>
                                    <TableHead className="h-8 text-xs font-semibold text-right">Qty</TableHead>
                                    <TableHead className="h-8 text-xs font-semibold text-right">Amount</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {userStats.products.map((p: any, j: number) => (
                                    <TableRow key={j} className="hover:bg-transparent border-b-gray-50">
                                      <TableCell className="py-2 text-sm text-gray-600 font-medium">{p.name}</TableCell>
                                      <TableCell className="py-2 text-sm text-gray-600 text-right">{p.qty}</TableCell>
                                      <TableCell className="py-2 text-sm font-semibold text-gray-800 text-right">₹{p.amount}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
                          Error: Old draft format. Please cancel and restart count.
                        </div>
                      )}

                      {/* DRAFT DAILY SALES LOG */}
                      {draftReport.breakdown && draftReport.breakdown.daily_sales_log && draftReport.breakdown.daily_sales_log.length > 0 && (
                        <div className="mt-8 border-t border-gray-100 pt-6">
                          <h3 className="font-semibold text-gray-700 mb-4">Daily Sales Log</h3>
                          <div className="space-y-4">
                            {draftReport.breakdown.daily_sales_log.map((dayLog: any, i: number) => (
                              <div key={i} className="bg-white/80 border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-center p-3 bg-indigo-50/50 border-b border-gray-100">
                                  <p className="font-bold text-gray-700">{dayLog.date}</p>
                                  <Badge className="bg-indigo-600">Total: ₹{dayLog.total}</Badge>
                                </div>
                                <div className="p-0">
                                  <Table>
                                    <TableBody>
                                      {dayLog.items.map((item: any, j: number) => (
                                        <TableRow key={j} className="hover:bg-transparent border-b-gray-50">
                                          <TableCell className="py-2 text-sm text-gray-600 font-medium">{item.name}</TableCell>
                                          <TableCell className="py-2 text-sm text-gray-600 text-right">{item.qty}</TableCell>
                                          <TableCell className="py-2 text-sm font-semibold text-gray-800 text-right">₹{item.amount}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* DRAFT TRANSACTION LOG */}
                      {draftReport.breakdown && draftReport.breakdown.transaction_log && draftReport.breakdown.transaction_log.length > 0 && (
                        <div className="mt-8 border-t border-gray-100 pt-6">
                          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><History className="w-5 h-5 text-indigo-500" /> Transaction Log</h3>
                          <div className="space-y-3">
                            {draftReport.breakdown.transaction_log.map((tx: any, i: number) => (
                              <div key={i} className="bg-white/80 border border-gray-100 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-2 hover:shadow-md transition-shadow">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className={tx.type === 'Event' ? 'text-purple-600 border-purple-200 bg-white' : 'text-emerald-600 border-emerald-200 bg-white'}>{tx.type}</Badge>
                                    <span className="font-bold text-gray-700">{tx.date} {tx.time}</span>
                                  </div>
                                  <p className="text-sm text-gray-500 max-w-xl">{tx.items_str}</p>
                                </div>
                                <div className="text-left sm:text-right shrink-0">
                                  <p className="text-lg font-black text-indigo-600">₹{tx.total}</p>
                                  <div className="flex gap-2 text-xs font-medium sm:justify-end mt-1">
                                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Cash: ₹{tx.cash}</span>
                                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Online: ₹{tx.online}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* DRAFT RESTOCKING HISTORY */}
                      {draftReport.breakdown && draftReport.breakdown.restock_history && draftReport.breakdown.restock_history.length > 0 && (
                        <div className="mt-8 border-t border-gray-100 pt-6">
                          <h3 className="font-semibold text-gray-700 mb-4">Restocking History</h3>
                          <div className="space-y-2">
                            {draftReport.breakdown.restock_history.map((h: any, i: number) => (
                              <div key={i} className="flex justify-between items-center text-sm p-3 bg-white/80 border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                                <div><span className="font-bold">{h.product_name}</span> <span className="text-gray-400 mx-2">•</span> <span className="text-gray-500">{h.restocked_by}</span> <span className="text-gray-400 mx-2">•</span> <span className="text-xs text-gray-400">{h.date}</span></div>
                                <Badge className="bg-emerald-500">+{h.quantity}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RESTOCKING HISTORY */}
                  <div className="shrink-0 max-h-48 overflow-y-auto custom-scrollbar border-t border-gray-100 pt-4">
                    <h3 className="font-semibold text-gray-700 mb-3">Restocking History</h3>
                    {draftReport.restock_history && draftReport.restock_history.length > 0 ? (
                      <div className="space-y-2">
                        {draftReport.restock_history.map((h: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-sm p-3 bg-white/80 border border-gray-100 rounded-lg shadow-sm">
                            <div><span className="font-bold text-gray-800">{h.product_name}</span> <span className="text-gray-400 mx-2">•</span> <span className="text-gray-500">{h.restocked_by}</span> <span className="text-gray-400 mx-2">•</span> <span className="text-xs text-gray-400">{h.date}</span></div>
                            <Badge className="bg-emerald-500">+{h.quantity}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No restocks during this period.</p>
                    )}
                  </div>

                  {/* FINALIZE BUTTON */}
                  <div className="shrink-0 pt-2 border-t border-gray-100 flex gap-4">
                    <Button
                      variant="destructive"
                      onClick={cancelCount}
                      disabled={confirming}
                      className="flex-1 h-12 text-lg font-bold shadow"
                    >
                      Cancel Active Count
                    </Button>
                    <Button
                      onClick={finalizeCount}
                      disabled={confirming}
                      className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0 shadow-lg h-12 text-lg font-bold group"
                    >
                      <Lock className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                      {confirming ? "Finalizing & Locking..." : "Finalize & Lock Month"}
                    </Button>
                  </div>

                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

function Stat({ title, value, icon }: any) {
  return (
    <Card className="bg-slate-900/80 border border-white/10 backdrop-blur-md rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-white flex items-center justify-center scale-[2]">
        {icon}
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-widest font-bold text-slate-400 flex items-center gap-2">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value, highlight }: any) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-indigo-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function SimpleList({ title, rows, empty }: any) {
  return (
    <Card className="h-full flex flex-col bg-slate-900/80 border border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden mt-6">
      <CardHeader className="flex-shrink-0 bg-white/5 border-b border-white/10">
        <CardTitle className="text-white font-bold tracking-tight text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
        {rows.length === 0 ? (
          <p className="text-center text-slate-500 py-12 italic">{empty}</p>
        ) : (
          rows.map((r: any, i: number) => (
            <div key={i} className="flex justify-between items-center bg-black/30 border border-white/5 hover:bg-white/5 transition-colors p-4 rounded-2xl shrink-0">
              <div>
                <p className="font-bold text-white text-lg">{r.title}</p>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">{r.subtitle}</p>
              </div>
              <p className="font-black text-xl text-emerald-400">{r.value === undefined ? `₹${r.total_amount || 0}` : r.value}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function MonthSelector({ month, year, setMonth, setYear, months, years }: any) {
  return (
    <Card>
      <CardContent className="flex gap-4 p-4">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m: string, i: number) => (
              <SelectItem key={i} value={i.toString()}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y: string) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
