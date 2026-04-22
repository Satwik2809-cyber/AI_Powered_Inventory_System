import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Mic, StopCircle } from "lucide-react";
import { apiPost } from "../api";
import { toast } from "sonner";

interface Props {
  context: "daily_sell" | "event_sell" | "packing";
  eventName?: string;
  userId: number;
  onFill?: (data: { name?: string; quantity?: number; rate?: number }) => void;
  onAddItems?: (items: any[]) => void;
  onRemoveItems?: (items: any[]) => void;
  onAmbiguity?: (data: any) => void;
  onSuccess?: () => void;
}

export default function AISpeech({
  context,
  eventName,
  userId,
  onFill,
  onAddItems,
  onRemoveItems,
  onAmbiguity,
  onSuccess,
}: Props) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleListening = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN"; // English-India for Hinglish support (returns Latin script)
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setListening(false);
      recognitionRef.current = null; // Clear ref after result

      toast.message(`Heard: ${text}`);

      try {
        const res = await apiPost("/ai/command", {
          text,
          context,
          user_id: userId,
          event_name: eventName,
          payment_mode: "cash",
        });

        // 1. Ambiguity
        if (res.action === "ambiguous" && onAmbiguity && res.ambiguities) {
          onAmbiguity(res.ambiguities);
          // If we also got some resolved items, add them too?
          if (res.items && res.items.length > 0 && onAddItems) {
            onAddItems(res.items);
          }
          return;
        }

        // 2. Add to Cart (Multi-item)
        if (res.action === "add_to_cart" && onAddItems && res.items) {
          onAddItems(res.items);
          if (res.message) toast.success(res.message);
          onSuccess?.();
          return;
        }

        // 3. Remove from Cart
        if (res.action === "remove_from_cart" && onRemoveItems && res.items) {
          onRemoveItems(res.items);
          if (res.message) toast.success(res.message);
          onSuccess?.();
          return;
        }

        // 4. Fallback (Single Item fill)
        if (onFill) {
          onFill({
            name: res.parsed_items?.[0]?.name,
            quantity: res.parsed_items?.[0]?.quantity,
            rate: res.parsed_items?.[0]?.rate
          });
        }
        
        // Handle explicit backend errors (e.g., unknown command) or success
        if (res.error) {
          toast.error(res.error);
        } else if (!res.action) {
          toast.success(res.message || "AI command processed");
          onSuccess?.();
        }

      } catch (err: any) {
        toast.error(err.response?.data?.detail || err.message || "AI command failed");
      }
    };

    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <Button
      variant={listening ? "destructive" : "outline"}
      onClick={toggleListening}
      className="w-full"
    >
      {listening ? <StopCircle className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
      {listening ? "Stop" : "Speak"}
    </Button>
  );
}
