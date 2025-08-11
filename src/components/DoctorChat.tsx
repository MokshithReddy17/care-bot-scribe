import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function analyzeSymptoms(text: string): string {
  const lower = text.toLowerCase();
  const redFlags = ["chest pain", "shortness of breath", "severe bleeding", "loss of consciousness", "stroke", "numbness on one side", "suicidal"];
  const urgent = redFlags.some((f) => lower.includes(f));

  if (urgent) {
    return (
      "Your description contains potential emergency symptoms. Please call your local emergency number or go to the nearest emergency department immediately."
    );
  }

  const fever = /\b(fever|temperature|38\.?[0-9]?|high temp)\b/.test(lower);
  const cough = lower.includes("cough");
  const sore = lower.includes("sore throat") || lower.includes("throat");
  const headache = lower.includes("headache");

  let suggestions: string[] = [];
  if (fever) suggestions.push("Hydrate well and consider acetaminophen per label dosing if appropriate for you.");
  if (cough || sore) suggestions.push("Warm fluids, rest, and consider honey or lozenges. Monitor breathing difficulty.");
  if (headache) suggestions.push("Limit screen time, rest in a dark room, and hydrate. Track triggers.");
  if (suggestions.length === 0) suggestions.push("Could you share onset, severity (1–10), location, and any triggers or relieving factors?");

  return (
    suggestions.join(" ") + " If symptoms worsen, persist beyond 48–72 hours, or you have underlying conditions, seek in-person medical care."
  );
}

const DoctorChat = () => {
  const [messages, setMessages] = useState<Message[]>([{
    id: crypto.randomUUID(),
    role: "assistant",
    content: "Hi! I'm your AI health assistant. Tell me your symptoms and goals, and I'll suggest next steps. This is not medical advice.",
  }]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || isSending) return;
    const user: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, user]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/functions/v1/ai-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, user].map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) throw new Error(`LLM request failed: ${res.status}`);
      const data = await res.json();
      const replyText: string = data.reply || "Sorry, I couldn't generate a response.";
      const reply: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: replyText,
      };
      setMessages((m) => [...m, reply]);
    } catch (err) {
      console.error(err);
      toast("Falling back to local suggestions. Connect an API key for real LLM replies.");
      const reply: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: analyzeSymptoms(text),
      };
      setMessages((m) => [...m, reply]);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  return (
    <section id="chat" className="container mx-auto px-6 py-12">
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Private Symptom Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={listRef}
            className="h-[420px] w-full overflow-y-auto rounded-md border p-4 bg-background"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.map((m) => (
              <div key={m.id} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm border ${m.role === "user" ? "bubble-user" : "bubble-bot"}`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Describe your symptoms…"
              aria-label="Message"
              disabled={isSending}
              aria-busy={isSending}
            />
            <Button onClick={send} disabled={!canSend || isSending} variant="default">
              <Send className="opacity-90" />
              <span className="sr-only">Send</span>
            </Button>
          </div>

          <p id="disclaimer" className="mt-4 text-xs text-muted-foreground">
            Important: This chatbot is for education only and is not a substitute for professional medical advice, diagnosis, or treatment. In emergencies, call your local emergency number.
          </p>
        </CardContent>
      </Card>
    </section>
  );
};

export default DoctorChat;
