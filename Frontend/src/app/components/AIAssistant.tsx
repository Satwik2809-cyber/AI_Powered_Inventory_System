import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Mic, Camera, X, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

/* REAL MODULES */
import AISpeech from "./AISpeech";
import CameraScan from "./CameraScan";

/* ---------------------------------------------------
   AI ASSISTANT (FIGMA UI + REAL MODULES CONNECTED)
---------------------------------------------------- */

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"voice" | "camera" | null>(null);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---------------- VOICE CALLBACK ---------------- */

  const handleSpeechResult = (data: {
    name?: string;
    quantity?: number;
    intent?: string;
  }) => {
    setTranscript(JSON.stringify(data, null, 2));
    toast.success("Voice command processed");
    setMode(null);
  };

  /* ---------------- CAMERA CALLBACK ---------------- */

  const handleAutoMatch = (product: any) => {
    toast.success("Product detected");
    setTranscript(JSON.stringify(product, null, 2));
  };

  const handleConfirmMatch = (options: any[]) => {
    toast.message("Confirm product", {
      description: "Multiple matches found",
    });
  };

  /* ---------------- UI ---------------- */

  return (
    <>
      {/* FLOATING BUTTON */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600"
          onClick={() => {
            setIsOpen(!isOpen);
            setMode(null);
          }}
        >
          {isOpen ? <X /> : <Sparkles />}
        </Button>
      </div>

      {/* PANEL */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96">
          <Card className="shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Assistant
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <Badge variant="outline">Live AI Mode</Badge>

              {/* ACTIONS */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={mode === "voice" ? "default" : "outline"}
                  onClick={() => setMode("voice")}
                >
                  <Mic className="mr-2 h-4 w-4" />
                  Voice
                </Button>

                <Button
                  variant={mode === "camera" ? "default" : "outline"}
                  onClick={() => setMode("camera")}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Scan
                </Button>
              </div>

              {/* MODULE AREA */}
              {mode === "voice" && (
                <AISpeech
                  context="daily_sell"
                  eventName=""
                  userId={0}
                  onFill={handleSpeechResult}
                  onSuccess={() => setMode(null)}
                />
              )}

              {mode === "camera" && (
                <CameraScan
                  onAutoMatch={handleAutoMatch}
                  onConfirmMatch={handleConfirmMatch}
                />
              )}

              {/* RESULT */}
              {transcript && (
                <div className="p-3 bg-indigo-50 rounded border text-xs whitespace-pre-wrap">
                  {transcript}
                </div>
              )}

              {/* INFO */}
              <div className="text-xs text-gray-500 border-t pt-3">
                Powered by AI • Voice + Vision • Real Backend Connected
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
