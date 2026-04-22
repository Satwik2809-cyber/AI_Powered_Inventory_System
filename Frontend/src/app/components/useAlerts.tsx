import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { apiGet, apiPost } from "../api";

type Alert = {
  id: number;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  seen: boolean;
};

export default function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 🔔 load sound once
  useEffect(() => {
    audioRef.current = new Audio("/alert.mp3");
  }, []);

  // 🔁 poll WITHOUT alerts dependency
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const data = await apiGet("/alerts");

        const unseenBefore = alerts.filter(a => !a.seen).length;
        const unseenNow = data.filter((a: Alert) => !a.seen).length;

        if (unseenNow > unseenBefore) {
          audioRef.current?.play();
        }

        setAlerts(data);
      } catch (e) {
        console.error("Alert fetch failed", e);
      }
    };

    loadAlerts();
    const interval = setInterval(loadAlerts, 50000); // every 8 sec

    return () => clearInterval(interval);
  }, []); // ✅ EMPTY dependency

  const unseenCount = alerts.filter(a => !a.seen).length;

  const markSeen = async (id: number) => {
    await apiPost(`/alerts/${id}/seen`, {});
    setAlerts(prev =>
      prev.map(a => (a.id === id ? { ...a, seen: true } : a))
    );
  };

  return (
    <div className="fixed top-5 right-5 z-50">
      <button onClick={() => setOpen(!open)} className="relative">
        <Bell className="h-6 w-6" />
        {unseenCount > 0 && (
          <Badge className="absolute -top-2 -right-2 bg-red-600">
            {unseenCount}
          </Badge>
        )}
      </button>

      {open && (
        <Card className="w-96 max-h-[500px] overflow-auto mt-3 p-3 space-y-3">
          {alerts.length === 0 && (
            <p className="text-center text-gray-500">No alerts</p>
          )}

          {alerts.map(a => (
            <div
              key={a.id}
              className={`p-3 rounded border ${
                a.severity === "critical"
                  ? "bg-red-50 border-red-300"
                  : a.severity === "warning"
                  ? "bg-yellow-50 border-yellow-300"
                  : "bg-blue-50 border-blue-300"
              }`}
            >
              <div className="flex justify-between">
                <p className="font-semibold">{a.title}</p>
                {!a.seen && (
                  <button
                    className="text-xs underline"
                    onClick={() => markSeen(a.id)}
                  >
                    Mark seen
                  </button>
                )}
              </div>
              <p className="text-sm">{a.message}</p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
