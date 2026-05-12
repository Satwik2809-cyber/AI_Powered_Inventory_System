import { useState } from "react";
import { User } from "./type";
import { apiPut } from "../api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { Settings as SettingsIcon, User as UserIcon, Lock, ShieldCheck, Tag, ServerCrash, Trash2, Users, AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { apiDelete, apiGet } from "../api";

interface SettingsProps {
  currentUser: User;
}

export default function Settings({ currentUser }: SettingsProps) {
  const [name, setName] = useState(currentUser.name || currentUser.username);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async () => {
    if (!name.trim()) return toast.error("Name cannot be empty");
    
    setLoading(true);
    try {
      await apiPut(`/users/${currentUser.id}/profile`, { name: name.trim() });
      toast.success("Profile updated successfully!");
      
      // Update local storage so it persists a refresh before they logout
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.name = name.trim();
        localStorage.setItem("user", JSON.stringify(parsed));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match");
    }

    setLoading(true);
    try {
      await apiPut(`/users/${currentUser.id}/password`, { new_password: newPassword });
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
      {/* HEADER SECTION (GLASSMORPHIC) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/80 via-slate-800/80 to-slate-900/80 p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <SettingsIcon className="h-8 w-8 text-indigo-400" />
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white tracking-tight">
                Account Settings
              </h1>
            </div>
            <p className="text-indigo-200/80 text-lg max-w-xl">
              Manage your personal details and security preferences.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* PROFILE CARD */}
        <Card className="bg-slate-900/90 border-white/10 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none" />
          <CardHeader className="border-b border-white/10 bg-white/5 pb-4">
            <CardTitle className="text-2xl font-bold flex items-center gap-2 text-white">
              <UserIcon className="text-indigo-400" /> Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-400 text-xs uppercase tracking-widest font-bold">Username (Read-only)</Label>
              <div className="flex items-center gap-2 bg-black/30 border border-white/5 rounded-xl px-4 h-12 text-slate-500">
                <Tag className="w-4 h-4" /> {currentUser.username}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-400 text-xs uppercase tracking-widest font-bold">Role (Read-only)</Label>
              <div className="flex items-center gap-2 bg-black/30 border border-white/5 rounded-xl px-4 h-12 text-slate-500 capitalize">
                <ShieldCheck className="w-4 h-4" /> {currentUser.role}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-xs uppercase tracking-widest font-bold">Display Name</Label>
              <Input 
                className="bg-white/5 border-white/10 text-white focus:border-indigo-500 rounded-xl h-12 transition-colors"
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Enter your full name"
              />
            </div>
            
            <Button 
              onClick={handleUpdateProfile} 
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold h-12 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.3)] border-0"
            >
              Save Details
            </Button>
          </CardContent>
        </Card>

        {/* SECURITY CARD */}
        <Card className="bg-slate-900/90 border-white/10 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px] pointer-events-none" />
          <CardHeader className="border-b border-white/10 bg-white/5 pb-4">
            <CardTitle className="text-2xl font-bold flex items-center gap-2 text-white">
              <Lock className="text-purple-400" /> Security
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs uppercase tracking-widest font-bold">New Password</Label>
              <Input 
                type="password" 
                className="bg-white/5 border-white/10 text-white focus:border-purple-500 rounded-xl h-12 transition-colors"
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs uppercase tracking-widest font-bold">Confirm Password</Label>
              <Input 
                type="password" 
                className="bg-white/5 border-white/10 text-white focus:border-purple-500 rounded-xl h-12 transition-colors"
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>
            
            <Button 
               onClick={handleUpdatePassword} 
               disabled={loading}
               className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold h-12 rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.3)] border-0 mt-4"
            >
              Update Password
            </Button>
          </CardContent>
        </Card>
      </div>

      {currentUser.username === "Satwik" && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-6 min-w-full">
           <DeveloperCommandCenter />
        </div>
      )}
    </div>
  );
}

function DeveloperCommandCenter() {
  const [wiping, setWiping] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [passwords, setPasswords] = useState<any>({});
  
  useEffect(() => {
     apiGet("/developer/users").then(data => setUsersList(data)).catch(console.error);
  }, []);

  const handleWipe = async () => {
     const confirmed = window.confirm("WARNING: This will permanently destroy all items, events, and sales data! The users database (Brain Vault) will be saved. Proceed?");
     if (!confirmed) return;
     
     setWiping(true);
     try {
       await apiDelete("/developer/reset");
       toast.success("DEMO DATA WIPED SUCCESSFULLY!");
     } catch (err: any) {
       toast.error(err.response?.data?.detail || "Failed to wipe data");
     } finally {
       setWiping(false);
     }
  };

  const forceResetPassword = async (userId: number, username: string) => {
      const newPass = passwords[userId];
      if (!newPass || newPass.length < 6) return toast.error("Provide a password of at least 6 characters.");
      
      const confirmed = window.confirm(`Are you sure you want to FORCE OVERWRITE the password for user '${username}'?`);
      if(!confirmed) return;

      try {
         await apiPut(`/developer/force-password/${userId}`, { new_password: newPass });
         toast.success(`Password successfully injected for ${username}!`);
         setPasswords((prev: any) => ({...prev, [userId]: ""}));
      } catch (err: any) {
         toast.error("Failed to overwrite logic.");
      }
  };

  return (
    <Card className="bg-red-950/20 border-red-500/20 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden relative w-full">
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] pointer-events-none" />
      <CardHeader className="border-b border-red-500/10 bg-red-900/10 pb-4">
        <CardTitle className="text-2xl font-black flex items-center gap-2 text-red-500">
          <ServerCrash className="text-red-500" /> Developer Command Center
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        
        {/* DESTROY WIDGET */}
        <div className="bg-black/40 border border-red-500/10 rounded-2xl p-6">
           <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2"><Trash2 className="w-5 h-5"/> Environment Wipe Tool</h3>
           <p className="text-slate-400 text-sm mb-4">
              Permanently destroys ALL test items, events, invoices, and accounting history. It securely retains User IDs and roles for uninterrupted login flow.
           </p>
           <Button variant="destructive" className="w-full sm:w-auto font-bold h-12" onClick={handleWipe} disabled={wiping}>
              <AlertTriangle className="w-4 h-4 mr-2"/>
              {wiping ? "OBLITERATING DATA..." : "WIPE ALL DEMO DATA"}
           </Button>
        </div>

        {/* SECURE OVERRIDES */}
        <div className="bg-black/40 border border-red-500/10 rounded-2xl p-6">
           <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2"><Users className="w-5 h-5"/> Credential Manager (Bypass)</h3>
           <p className="text-slate-400 text-sm mb-4">
              Force-reset any user's active password without requesting old credentials.
           </p>
           <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {usersList.map(u => (
                  <div key={u.id} className="flex flex-col sm:flex-row justify-between items-center bg-white/5 border border-white/5 rounded-xl p-3 gap-4">
                      <div>
                          <p className="font-bold text-white text-sm">{u.username}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{u.role}</p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Input 
                            type="text" 
                            className="bg-black/50 border-white/10 h-9 w-full sm:w-40 text-xs text-white" 
                            placeholder="New Password"
                            value={passwords[u.id] || ""}
                            onChange={(e) => setPasswords((prev: any) => ({...prev, [u.id]: e.target.value}))}
                           />
                          <Button 
                             size="sm" 
                             className="bg-red-600/80 hover:bg-red-500 text-white"
                             onClick={() => forceResetPassword(u.id, u.username)}
                          >
                             Force
                          </Button>
                      </div>
                  </div>
              ))}
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
