import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Sparkles, KeyRound, User as UserIcon, ArrowRight } from "lucide-react";

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await onLogin(username, password);
      if (success) {
        toast.success("Authentication successful");
      } else {
        toast.error("Invalid credentials");
      }
    } catch (error) {
      toast.error("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTIwIDIwdjIwSDIwdjIwSDBWMjB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDIpIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] pointer-events-none" />

      <div className="w-full max-w-md p-6 relative z-10 animate-in fade-in zoom-in duration-700">

        {/* Glassmorphic Card */}
        <div className="bg-slate-900/40 border border-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">

          {/* Subtle top border highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-indigo-500/30 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200 tracking-tight mb-2">
              Sanjeevika
            </h1>
            <p className="text-indigo-200/60 text-sm font-medium tracking-wide uppercase">
              AI Powered Inventory Matrix
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 group">
              <Label className="text-slate-400 text-xs font-bold uppercase tracking-widest group-focus-within:text-indigo-400 transition-colors">Username</Label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <Input
                  className="pl-12 h-14 bg-black/40 border-white/10 text-white rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-lg"
                  placeholder="Enter your handle"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <Label className="text-slate-400 text-xs font-bold uppercase tracking-widest group-focus-within:text-purple-400 transition-colors">Security Key</Label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                <Input
                  type="password"
                  className="pl-12 h-14 bg-black/40 border-white/10 text-white rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all text-lg"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border-0 flex items-center justify-center gap-2 group"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="h-6 w-6 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
              ) : (
                <>
                  Authenticate <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

        </div>

        {/* Footer Text */}
        <p className="text-center text-slate-500 text-xs mt-8 font-medium">
          Protected by AES-256 Encryption & Zero-Trust Architecture
        </p>
      </div>
    </div>
  );
}
