import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Auto backend selector
const BACKEND_URL = import.meta.env.VITE_API_URL || "https://mediroute-ai.onrender.com";


export default function MediBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: `👩‍⚕️ Hello! I am MediBot — your emergency AI nurse.

I will:
• Give clear, short, and crisp instructions
• Use separate lines for each step
• Avoid long explanations
• Focus on immediate life-saving actions

Describe the emergency to begin.`
    }
  ]);

  const quickScenarios = [
    "Patient unconscious",
    "Heavy bleeding",
    "Heart attack symptoms",
    "Seizure",
    "Burn injury",
    "Low oxygen",
    "Fracture",
    "Road accident"
  ];

  const send = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim()) return;

    setMessages(prev => [...prev, { from: "user", text: msg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/medibot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: msg })
      });

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        { from: "bot", text: data.reply || "No response received." }
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          from: "bot",
          text: "⚠️ Unable to connect to medical server. Proceed to nearest hospital immediately."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed bottom-4 right-4 z-50 cursor-pointer group flex flex-col items-center"
        onClick={() => setOpen(true)}
      >
        <img
          src="/medibot.png"
          alt="MediBot Assistant"
          className="w-20 h-20 rounded-full object-cover transition-transform duration-300 ease-out group-hover:-translate-y-1"
        />
        <span className="mt-1 text-xs text-muted-foreground tracking-wide">
          Assistant
        </span>
      </div>

      {open && (
        <Card className="fixed bottom-20 right-6 w-[520px] h-[520px] p-3 z-50 rounded-xl flex flex-col">
          <div className="text-center font-bold text-lg mb-2">
            MediBot Assistant
          </div>

          <div className="flex flex-1 gap-3 overflow-hidden">
            <div className="w-40 overflow-y-auto space-y-2">
              {quickScenarios.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs py-2 px-2 rounded-lg text-left"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 text-sm">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg max-w-[90%] whitespace-pre-line ${
                    m.from === "bot"
                      ? "bg-muted text-cyan-300"
                      : "bg-cyan-500/20 ml-auto text-right"
                  }`}
                >
                  {m.text}
                </div>
              ))}

              {loading && (
                <div className="text-xs text-cyan-400">
                  MediBot typing...
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask MediBot..."
            />
            <Button onClick={() => send()}>Send</Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="mt-1"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </Card>
      )}
    </>
  );
}
