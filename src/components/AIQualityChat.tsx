import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Bot, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestedPrompts = [
  "How can I improve my data quality score?",
  "What's the best way to handle missing values?",
  "Explain the outlier detection method",
  "How do I use data enrichment?",
];

const mockResponses: Record<string, string> = {
  "improve": "To improve your data quality score:\n\n1. **Handle Missing Values**: Use intelligent imputation methods like rolling means for sensor data and mode values for categorical fields\n\n2. **Remove Outliers**: Cap extreme values using the IQR method or P99.5 percentile\n\n3. **Enrich Data**: Add derived features like machine_age_yrs, energy_kwh, and health_score\n\n4. **Remove Duplicates**: Identify and remove duplicate records based on timestamp and machine_id\n\nYour current score is 72%. Applying these steps can bring it to 96%+",
  
  "missing": "Best practices for handling missing values:\n\n**Numerical Sensor Data:**\n- Rolling mean imputation (e.g., 1-hour window for temperature)\n- Median imputation for vibration data\n- Forward-fill for short gaps (≤ 5 minutes)\n\n**Categorical Data:**\n- Mode imputation (most frequent value per shift/machine)\n- For operator_id: use most frequent operator per shift+machine\n\n**Important:** Always preserve data integrity and avoid introducing bias. Document all imputation methods for audit trails.",
  
  "outlier": "Outlier Detection using IQR (Interquartile Range):\n\n**Method:**\n1. Calculate Q1 (25th percentile) and Q3 (75th percentile)\n2. Compute IQR = Q3 - Q1\n3. Define outliers as values outside [Q1 - 1.5×IQR, Q3 + 1.5×IQR]\n\n**In Your Data:**\n- Temperature outliers: 142 detected (e.g., M-106 at 246°C)\n- Action: Cap to P99.5 (96°C) instead of removing\n\n**Why Cap vs Remove:**\nCapping preserves record count while removing impossible values, which is crucial for time-series analysis.",
  
  "enrich": "Data Enrichment Strategies:\n\n**Feature Engineering:**\n1. **machine_age_yrs**: Join from asset registry → helps predict failure\n2. **energy_kwh**: Calculate from current × voltage × runtime\n3. **health_score**: Composite metric from vibration, temp, age, risk\n\n**Benefits:**\n- Improves ML model R² by ~0.18\n- Provides deeper operational insights\n- Enables predictive maintenance\n\n**Implementation:**\nUse automated enrichment pipelines to maintain data freshness and consistency.",
};

function getResponse(query: string): string {
  const q = query.toLowerCase();
  
  if (q.includes("improv") || q.includes("quality") || q.includes("score")) {
    return mockResponses.improve;
  }
  if (q.includes("missing") || q.includes("null") || q.includes("empty")) {
    return mockResponses.missing;
  }
  if (q.includes("outlier") || q.includes("anomal") || q.includes("extreme")) {
    return mockResponses.outlier;
  }
  if (q.includes("enrich") || q.includes("feature") || q.includes("derive")) {
    return mockResponses.enrich;
  }
  
  return "I can help you with:\n\n• **Data Quality Improvement** - strategies to boost your quality score\n• **Missing Values** - intelligent imputation techniques\n• **Outlier Detection** - identifying and handling extreme values\n• **Data Enrichment** - feature engineering and derived columns\n\nWhat would you like to know more about?";
}

export function AIQualityChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your AI Data Quality Assistant. I can help you:\n\n• Improve your data quality score\n• Handle missing values intelligently\n• Detect and manage outliers\n• Enrich your dataset with new features\n\nHow can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI processing
    setTimeout(() => {
      const response = getResponse(input);
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Suggested Prompts */}
      <div className="shrink-0 p-4 border-b bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Suggested questions:
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSuggestedPrompt(prompt)}
              className="text-xs bg-background border rounded-full px-3 py-1.5 hover:bg-muted transition-colors text-left"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="h-8 w-8 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <Card className="rounded-card p-4 bg-card border">
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content.split("\n").map((line, i) => {
                        // Handle bold text
                        const parts = line.split(/(\*\*.*?\*\*)/g);
                        return (
                          <p key={i} className={line.trim() === "" ? "h-2" : ""}>
                            {parts.map((part, j) => {
                              if (part.startsWith("**") && part.endsWith("**")) {
                                return <strong key={j}>{part.slice(2, -2)}</strong>;
                              }
                              return part;
                            })}
                          </p>
                        );
                      })}
                    </div>
                  </Card>
                  <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            )}
            {message.role === "user" && (
              <div className="max-w-[75%]">
                <div className="rounded-card bg-accent text-accent-foreground px-4 py-3">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-right mr-1">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <Card className="rounded-card p-4 bg-card border">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </Card>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Info Banner */}
      <div className="shrink-0 px-4 py-2 bg-accent/5 border-t border-accent/20">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
          <p>
            <strong className="text-accent">Demo Mode:</strong> Responses are simulated. In production, this connects to your AI backend for real-time data quality analysis.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about data quality improvements..."
            className="flex-1"
            disabled={isTyping}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
