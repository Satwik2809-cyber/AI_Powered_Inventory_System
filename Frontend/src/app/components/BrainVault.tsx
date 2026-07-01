import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "../api";
import { toast } from "sonner";

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
  SelectValue,
} from "./ui/select";

import { UserPlus, Eye, Shield, Edit, CalendarDays, MapPin, TrendingUp, Sparkles, CheckCircle, Key } from "lucide-react";

/* ---------------- CONSTANTS ---------------- */
// Areas/Categories are now fetched dynamically from the database.

/* ---------------- TYPES ---------------- */
interface EventType {
  id: number;
  name: string;
  open_sell: boolean;
  status: string;
}

interface AssignedEvent {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
  name: string;
  role: "Admin" | "Sevadar" | "admin" | "user";
  assigned_areas: string[];
  assigned_events: AssignedEvent[];
}

function CategoriesTab({ areas, loadData }: { areas: string[], loadData: () => void }) {
  const [newCat, setNewCat] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editOldName, setEditOldName] = useState("");
  const [editNewName, setEditNewName] = useState("");

  async function handleAdd() {
    if (!newCat.trim()) return;
    try {
      const formData = new URLSearchParams();
      formData.append("name", newCat);
      await apiPost("/categories", formData, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      toast.success("Category added!");
      setNewCat("");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to add category");
    }
  }

  async function handleEdit() {
    if (!editNewName.trim()) return;
    try {
      const formData = new URLSearchParams();
      formData.append("new_name", editNewName);
      await apiPut(`/categories/${encodeURIComponent(editOldName)}`, formData, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      toast.success("Category updated!");
      setEditOpen(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to update category");
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Are you sure you want to delete '${name}'? This will remove it from all users and products.`)) return;
    try {
      // Assuming apiDelete exists, wait we don't have apiDelete imported? Let me just use standard fetch or add apiDelete.
      // Wait, apiGet, apiPost, apiPut are in api.ts. We might not have apiDelete.
      // I can write a quick custom fetch.
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/categories/${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Category deleted!");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/90 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-purple-300">Category Management</CardTitle>
          <p className="text-sm text-slate-400">Add, rename, or delete categories. Changes instantly sync across all products and user assignments.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-slate-300">New Category Name</Label>
              <Input className="bg-white/5 border-white/10 text-white focus:border-purple-500" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Soaps, Bracelets" />
            </div>
            <Button onClick={handleAdd} className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg">Add Category</Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
            {areas.map(a => (
              <div key={a} className="flex justify-between items-center bg-white/5 border border-white/10 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <span className="font-semibold text-slate-200 truncate pr-2">{a}</span>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-400 hover:bg-indigo-500/20" onClick={() => { setEditOldName(a); setEditNewName(a); setEditOpen(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400 hover:bg-rose-500/20" onClick={() => handleDelete(a)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[400px] border border-white/20 bg-slate-900/95 backdrop-blur-3xl text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-purple-300">Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Name</Label>
              <Input className="bg-white/5 border-white/10 text-white" value={editNewName} onChange={(e) => setEditNewName(e.target.value)} />
            </div>
            <Button onClick={handleEdit} className="w-full bg-purple-600 hover:bg-purple-500 text-white">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BrainVault() {
  /* ---------------- STATE ---------------- */
  const [activeTab, setActiveTab] = useState<"users" | "categories">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<EventType[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordUserId, setPasswordUserId] = useState<number | null>(null);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [newUser, setNewUser] = useState({
    username: "",
    name: "",
    password: "",
    role: "Sevadar",
    assigned_areas: [] as string[],
    assigned_events: [] as number[],
  });

  const [editData, setEditData] = useState({
    assigned_areas: [] as string[],
    assigned_events: [] as number[],
  });

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const usersData = await apiGet("/users");
      setUsers(usersData);

      const eventsData = await apiGet("/events");
      setEvents(eventsData.filter((e: EventType) => !['completed', 'closed', 'closed_pending_return'].includes((e.status || "").toLowerCase())));
      
      const catsData = await apiGet("/categories");
      setAreas(catsData);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- CREATE USER ---------------- */
  async function handleAddUser() {
    if (!newUser.username || !newUser.password || !newUser.name) {
      toast.error("Fill the required fields (Name, Username, Password)");
      return;
    }

    try {
      await apiPost("/users", newUser);
      toast.success("User created successfully!");
      setAddOpen(false);
      setNewUser({
        username: "",
        name: "",
        password: "",
        role: "Sevadar",
        assigned_areas: [],
        assigned_events: [],
      });
      loadData();
    } catch (e: any) {
      toast.error("User creation failed: " + (e.message || ""));
    }
  }

  /* ---------------- LOAD USER STATS ---------------- */
  async function loadStats(userId: number) {
    try {
      const data = await apiGet(`/users/${userId}/stats`);
      setStats(data);
      setStatsOpen(true);
    } catch {
      toast.error("Failed to load stats");
    }
  }

  /* ---------------- CHANGE ROLE ---------------- */
  async function changeRole(userId: number, role: string) {
    try {
      await apiPut(`/users/${userId}/role`, { role });
      toast.success("Role updated successfully!");
      loadData();
    } catch {
      toast.error("Role update failed. Make sure you are an Admin.");
    }
  }

  /* ---------------- CHANGE PASSWORD ---------------- */
  async function handlePasswordChange() {
    if (!newPassword || !passwordUserId) {
      toast.error("Please enter a new password");
      return;
    }
    try {
      await apiPut(`/users/${passwordUserId}/password`, { new_password: newPassword });
      toast.success("Password updated successfully!");
      setPasswordOpen(false);
      setNewPassword("");
    } catch {
      toast.error("Failed to update password");
    }
  }

  /* ---------------- UPDATE ASSIGNMENTS ---------------- */
  async function updateAssignments() {
    if (!selectedUser) return;
    try {
      await apiPut(`/users/${selectedUser.id}`, {
        assigned_areas: editData.assigned_areas,
        assigned_events: editData.assigned_events,
      });
      toast.success("User assignments updated!");
      setEditOpen(false);
      loadData();
    } catch {
      toast.error("Update failed");
    }
  }

  function toggleArea(area: string, isEditing = false) {
    if (isEditing) {
      const exists = editData.assigned_areas.includes(area);
      setEditData({
        ...editData,
        assigned_areas: exists
          ? editData.assigned_areas.filter((a) => a !== area)
          : [...editData.assigned_areas, area],
      });
    } else {
      const exists = newUser.assigned_areas.includes(area);
      setNewUser({
        ...newUser,
        assigned_areas: exists
          ? newUser.assigned_areas.filter((a) => a !== area)
          : [...newUser.assigned_areas, area],
      });
    }
  }

  function toggleEvent(eventId: number, isEditing = false) {
    if (isEditing) {
      const exists = editData.assigned_events.includes(eventId);
      setEditData({
        ...editData,
        assigned_events: exists
          ? editData.assigned_events.filter((id) => id !== eventId)
          : [...editData.assigned_events, eventId],
      });
    } else {
      const exists = newUser.assigned_events.includes(eventId);
      setNewUser({
        ...newUser,
        assigned_events: exists
          ? newUser.assigned_events.filter((id) => id !== eventId)
          : [...newUser.assigned_events, eventId],
      });
    }
  }

  /* ================= UI ================= */
  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
      {/* HEADER SECTION (GLASSMORPHIC) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/80 via-purple-900/80 to-slate-900/80 p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/30 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-8 w-8 text-indigo-400" />
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white tracking-tight">
                Brain Vault
              </h1>
            </div>
            <p className="text-indigo-200/80 text-lg max-w-xl">
              Centralized intelligence center for managing organizational roles, permissions, and event assignments.
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => setActiveTab("users")}
              className={`h-12 px-6 rounded-xl transition-all duration-300 ${activeTab === 'users' ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]' : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md'}`}
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Users
            </Button>
            <Button
              onClick={() => setActiveTab("categories")}
              className={`h-12 px-6 rounded-xl transition-all duration-300 ${activeTab === 'categories' ? 'bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]' : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md'}`}
            >
              <MapPin className="h-5 w-5 mr-2" />
              Categories
            </Button>
            {activeTab === 'users' && (
              <Button
                onClick={() => setAddOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300 hover:scale-105 h-12 px-6 rounded-xl"
              >
                <UserPlus className="h-5 w-5 mr-2 text-indigo-300" />
                Add New User
              </Button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'categories' && (
        <CategoriesTab areas={areas} loadData={loadData} />
      )}

      {activeTab === 'users' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((u) => (
          <div key={u.id} className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-500"></div>
            <div className="relative h-full bg-slate-900/90 border border-white/10 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between hover:translate-y-[-4px] transition-all duration-300">

              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {u.name}
                      {(u.role === "Admin" || u.role === "admin") && (
                        <Shield className="h-4 w-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                      )}
                    </h3>
                    <p className="text-sm text-slate-400">@{u.username}</p>
                  </div>

                  <Select
                    defaultValue={u.role === "admin" ? "Admin" : (u.role === "user" ? "Sevadar" : u.role)}
                    onValueChange={(v) => changeRole(u.id, v)}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs bg-white/5 border-white/10 text-white focus:ring-indigo-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10 text-white">
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Sevadar">Sevadar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Areas */}
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2">
                      <MapPin className="h-3 w-3" /> Assigned Areas
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {u.assigned_areas.length > 0 ? (
                        u.assigned_areas.map((a) => (
                          <span key={a} className="px-2 py-1 text-xs rounded-md bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                            {a}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No areas assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Events */}
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2">
                      <CalendarDays className="h-3 w-3" /> Active Events
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {u.assigned_events.filter((e: any) => !['completed', 'closed', 'closed_pending_return'].includes((e.status || '').toLowerCase())).length > 0 ? (
                        u.assigned_events.filter((e: any) => !['completed', 'closed', 'closed_pending_return'].includes((e.status || '').toLowerCase())).map((e: any) => (
                          <span key={e.id} className="px-2 py-1 text-xs rounded-md bg-purple-500/20 text-purple-200 border border-purple-500/30">
                            {e.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No events assigned</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2">
                      <CheckCircle className="h-3 w-3" /> Completed Events
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {u.assigned_events.filter((e: any) => ['completed', 'closed', 'closed_pending_return'].includes((e.status || '').toLowerCase())).length > 0 ? (
                        u.assigned_events.filter((e: any) => ['completed', 'closed', 'closed_pending_return'].includes((e.status || '').toLowerCase())).map((e: any) => (
                          <span key={e.id} className="px-2 py-1 text-xs rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 opacity-70">
                            {e.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic flex items-center gap-1 opacity-50">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
                  onClick={() => loadStats(u.id)}
                >
                  <TrendingUp className="h-4 w-4 mr-2 text-emerald-400" />
                  Stats
                </Button>

                <Button
                  size="sm"
                  className="bg-indigo-600/80 hover:bg-indigo-500 text-white backdrop-blur-md transition-colors"
                  onClick={() => {
                    setSelectedUser(u);
                    setEditData({
                      assigned_areas: u.assigned_areas,
                      assigned_events: u.assigned_events.map(e => e.id)
                    });
                    setEditOpen(true);
                  }}
                  title="Edit Access"
                >
                  <Edit className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/5 border-white/10 text-slate-200 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/50 transition-colors"
                  onClick={() => {
                    setPasswordUserId(u.id);
                    setPasswordOpen(true);
                  }}
                  title="Change Password"
                >
                  <Key className="h-4 w-4" />
                </Button>
              </div>

            </div>
          </div>
        ))}
      </div>
      )}

      {/* ADD USER DIALOG */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[500px] border border-white/20 bg-slate-900/95 backdrop-blur-3xl text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300">
              Create New User
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Full Name</Label>
                <Input
                  className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Username</Label>
                <Input
                  className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="e.g. john_d"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Password</Label>
                <Input
                  type="password"
                  className="bg-white/5 border-white/10 text-white focus:border-indigo-500"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(v: any) => setNewUser({ ...newUser, role: v })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-indigo-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10 text-white">
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Sevadar">Sevadar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <Label className="text-indigo-300 flex items-center gap-2"><MapPin className="h-4 w-4" /> Assign Standard Areas</Label>
              <div className="flex flex-wrap gap-2">
                {areas.map((a) => (
                  <Badge
                    key={a}
                    className={`cursor-pointer transition-all duration-200 ${newUser.assigned_areas.includes(a)
                      ? "bg-indigo-500 text-white hover:bg-indigo-600"
                      : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                      }`}
                    variant="outline"
                    onClick={() => toggleArea(a)}
                  >
                    {a}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <Label className="text-purple-300 flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Assign Active Events</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {events.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No active events found.</p>
                ) : (
                  events.filter(e => !['completed', 'closed', 'closed_pending_return'].includes(e.status.toLowerCase())).map((e) => (
                    <Badge
                      key={e.id}
                      className={`cursor-pointer transition-all duration-200 ${newUser.assigned_events.includes(e.id)
                        ? "bg-purple-500 text-white hover:bg-purple-600"
                        : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                        }`}
                      variant="outline"
                      onClick={() => toggleEvent(e.id)}
                    >
                      {e.name} {e.open_sell ? "(Open)" : "(Area)"}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <Button
              className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0 shadow-lg"
              onClick={handleAddUser}
            >
              <UserPlus className="h-4 w-4 mr-2" /> Complete Creation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT ACCESS DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px] border border-white/20 bg-slate-900/95 backdrop-blur-3xl text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Edit className="h-5 w-5 text-indigo-400" /> Modify Access for {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 py-2">
              <div className="space-y-3">
                <Label className="text-indigo-300 font-semibold">Standard Area Restrictions</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                  {areas.map((a) => (
                    <Badge
                      key={a}
                      className={`cursor-pointer transition-all duration-200 ${editData.assigned_areas.includes(a)
                        ? "bg-indigo-500 text-white hover:bg-indigo-600 border-0"
                        : "bg-transparent text-slate-300 border-white/20 hover:bg-white/10 hover:text-white"
                        }`}
                      variant="outline"
                      onClick={() => toggleArea(a, true)}
                    >
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-purple-300 font-semibold">Special Event Assignments</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-white/5 rounded-xl border border-white/5 max-h-40 overflow-y-auto custom-scrollbar">
                  {events.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No events available to assign.</p>
                  ) : (
                    events.map((e) => (
                      <Badge
                        key={e.id}
                        className={`cursor-pointer transition-all duration-200 ${editData.assigned_events.includes(e.id)
                          ? "bg-purple-500 text-white hover:bg-purple-600 border-0"
                          : "bg-transparent text-slate-300 border-white/20 hover:bg-white/10 hover:text-white"
                          }`}
                        variant="outline"
                        onClick={() => toggleEvent(e.id, true)}
                      >
                        {e.name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <Button
                className="w-full h-12 text-md font-semibold bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all"
                onClick={updateAssignments}
              >
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* USER STATS DIALOG */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="sm:max-w-[450px] border border-white/20 bg-slate-900/95 backdrop-blur-3xl text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold pb-2 border-b border-white/10">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
              Performance Stats
            </DialogTitle>
          </DialogHeader>

          {stats ? (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                  <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Sales</div>
                  <div className="text-3xl font-bold text-white">{stats.total_sales || 0}</div>
                </div>
                <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-center">
                  <div className="text-emerald-300 text-xs uppercase tracking-wider mb-1">Total Revenue</div>
                  <div className="text-3xl font-bold text-emerald-400">₹{stats.total_revenue?.toLocaleString() || 0}</div>
                </div>
              </div>

              {/* DAILY */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Standard Daily Sales
                </h3>
                <div className="max-h-32 overflow-y-auto custom-scrollbar bg-black/20 rounded-lg p-2 border border-white/5">
                  {stats.daily_sales && stats.daily_sales.length > 0 ? (
                    stats.daily_sales.map((d: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm py-1.5 px-2 hover:bg-white/5 rounded-md transition-colors">
                        <span className="text-slate-400">{d.date}</span>
                        <span className="font-medium text-white">₹{d.revenue.toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 text-sm italic p-2">No daily sales recorded</div>
                  )}
                </div>
              </div>

              {/* EVENTS */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Special Event Sales
                </h3>
                <div className="max-h-32 overflow-y-auto custom-scrollbar bg-black/20 rounded-lg p-2 border border-white/5">
                  {stats.event_sales && stats.event_sales.length > 0 ? (
                    stats.event_sales.map((e: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm py-1.5 px-2 hover:bg-white/5 rounded-md transition-colors">
                        <span className="text-slate-400">{e.event_name}</span>
                        <span className="font-medium text-white">₹{e.revenue.toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 text-sm italic p-2">No event sales recorded</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CHANGE PASSWORD DIALOG */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-[400px] border border-white/20 bg-slate-900/95 backdrop-blur-3xl text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Key className="h-5 w-5 text-rose-400" /> Reset Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">New Password</Label>
              <Input
                type="password"
                className="bg-white/5 border-white/10 text-white focus:border-rose-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password..."
              />
            </div>
            <Button
              className="w-full bg-rose-600 hover:bg-rose-500 text-white"
              onClick={handlePasswordChange}
            >
              Update Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
