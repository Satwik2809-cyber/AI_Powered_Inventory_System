import { useState } from "react";
import { AppState } from "../App";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Mic, Camera, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AIAssistantProps {
  appState: AppState;
  setAppState: (state: AppState) => void;
}

export default function AIAssistant({ appState, setAppState }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const handleVoiceInput = () => {
    setIsListening(true);
    
    // Simulate voice recognition (placeholder)
    setTimeout(() => {
      const examples = [
        "Add 50 plates at rate 20 to Utilities",
        "Sell 2 detergent packets at 120 rupees",
        "Restock rice 100 units in Food area",
        "Create Sunday event for next week",
      ];
      const randomExample = examples[Math.floor(Math.random() * examples.length)];
      setTranscript(randomExample);
      setIsListening(false);
      toast.info("Voice command recognized (Demo)", {
        description: randomExample,
      });
    }, 2000);
  };

  const handleCameraInput = () => {
    // Placeholder for camera/image recognition
    toast.info("Camera feature (Demo)", {
      description: "In production, this would scan item images/barcodes",
    });
  };

  const handleProcessCommand = () => {
    if (!transcript) {
      toast.error("No command to process");
      return;
    }

    // Simple command parsing (demo)
    toast.success("AI Command Processed (Demo)", {
      description: "In production, AI would parse and execute: " + transcript,
    });
    setTranscript("");
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Sparkles className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* AI Assistant Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96">
          <Card className="shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <CardTitle className="flex items-center text-lg">
                <Sparkles className="h-5 w-5 mr-2" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Use voice or camera to quickly add items, make sales, or manage inventory
                </p>
                <Badge variant="outline" className="text-xs">
                  Demo Mode - AI Features
                </Badge>
              </div>

              {/* Voice Input */}
              <div className="space-y-2">
                <Button
                  className="w-full"
                  variant={isListening ? "default" : "outline"}
                  onClick={handleVoiceInput}
                  disabled={isListening}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  {isListening ? "Listening..." : "Voice Command"}
                </Button>
                {isListening && (
                  <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-150"></div>
                  </div>
                )}
              </div>

              {/* Camera Input */}
              <Button
                className="w-full"
                variant="outline"
                onClick={handleCameraInput}
              >
                <Camera className="h-4 w-4 mr-2" />
                Scan Item / Barcode
              </Button>

              {/* Transcript Display */}
              {transcript && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium mb-1">Recognized Command:</p>
                  <p className="text-sm text-gray-700">{transcript}</p>
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={handleProcessCommand}
                  >
                    Execute Command
                  </Button>
                </div>
              )}

              {/* Example Commands */}
              <div className="pt-4 border-t">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Example Commands:
                </p>
                <div className="space-y-1 text-xs text-gray-500">
                  <p>• "Add 50 plates at rate 20"</p>
                  <p>• "Sell 2 detergent packets"</p>
                  <p>• "Restock rice 100 units"</p>
                  <p>• "Create Sunday event"</p>
                </div>
              </div>

              {/* Features Info */}
              <div className="p-3 bg-gray-50 rounded-lg text-xs">
                <p className="font-medium mb-1">AI Features (Demo):</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Voice command recognition</li>
                  <li>Image/barcode scanning</li>
                  <li>Natural language processing</li>
                  <li>Smart suggestions</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
