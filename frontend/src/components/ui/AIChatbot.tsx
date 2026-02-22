"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ChevronDown,
  Loader2,
  Zap,
} from "lucide-react";
import axios from "axios";

/* eslint-disable @typescript-eslint/no-explicit-any */

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const PREDEFINED_QUESTIONS = [
  "What is my current compliance score?",
  "Which violations need immediate attention?",
  "Which records are most at risk?",
  "Summarize the latest scan results.",
  "What are my top 3 compliance risks?",
  "How can I improve data protection?",
  "Are there critical encryption violations?",
  "Give me an action plan to reach 90% compliance.",
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function formatAnswer(text: string) {
  // Convert **bold** and bullet points to styled spans
  return text
    .split("\n")
    .map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      // Bullet points
      const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ");
      const formatted = trimmed
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #a5b4fc">$1</strong>')
        .replace(/^\*\s+/, "")
        .replace(/^-\s+/, "")
        .replace(/^•\s+/, "");
      if (isBullet) {
        return (
          <div key={i} className="flex items-start gap-2 mt-1">
            <span style={{ color: "#818cf8", marginTop: 4 }}>▸</span>
            <span dangerouslySetInnerHTML={{ __html: formatted }} />
          </div>
        );
      }
      return (
        <p
          key={i}
          className="mt-1"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    })
    .filter(Boolean);
}

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your **PolicyPulse AI Assistant** powered by Gemini. I have access to your live compliance data — ask me anything about violations, rules, risks, or how to improve your compliance score.\n\nTry one of the quick questions below, or type your own!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuestions, setShowQuestions] = useState(true);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!open && messages.length > 1) {
      setUnread((u) => u + 1);
    }
  }, [messages]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question.trim(),
      timestamp: new Date(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    setShowQuestions(false);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API}/api/ai/chat`,
        { question: question.trim(), include_context: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.data.answer || "No response received.",
        timestamp: new Date(),
      };
      setMessages((m) => [...m, aiMsg]);
    } catch (e: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, I couldn't reach the AI service. Please ensure your **GEMINI_API_KEY** is set in the backend `.env` file.",
        timestamp: new Date(),
      };
      setMessages((m) => [...m, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(79,70,229,0.9), rgba(124,58,237,0.9))",
          border: "1px solid rgba(255,255,255,0.2)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 8px 32px rgba(79,70,229,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
        whileHover={{ scale: 1.08, boxShadow: "0 12px 40px rgba(79,70,229,0.65)" }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={22} color="white" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Sparkles size={22} color="white" />
            </motion.div>
          )}
        </AnimatePresence>
        {unread > 0 && !open && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ background: "#f43f5e", color: "white" }}
          >
            {unread}
          </motion.span>
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 320 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] flex flex-col rounded-3xl overflow-hidden"
            style={{
              height: "580px",
              background: "rgba(8,10,22,0.88)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(32px) saturate(200%)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(129,140,248,0.12)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(79,70,229,0.12)" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.8), rgba(124,58,237,0.8))", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <Bot size={18} color="white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.93)" }}>
                  PolicyPulse AI
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px]" style={{ color: "rgba(52,211,153,0.8)" }}>
                    Gemini 1.5 Flash · Live data
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.25)" }}>
                <Zap size={11} style={{ color: "#a5b4fc" }} />
                <span className="text-[10px] font-semibold" style={{ color: "#a5b4fc" }}>Agentic AI</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollbarWidth: "thin" }}>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className="w-7 h-7 rounded-xl shrink-0 flex items-center justify-center mt-0.5"
                    style={
                      msg.role === "assistant"
                        ? { background: "rgba(79,70,229,0.3)", border: "1px solid rgba(129,140,248,0.3)" }
                        : { background: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.3)" }
                    }
                  >
                    {msg.role === "assistant"
                      ? <Bot size={14} style={{ color: "#a5b4fc" }} />
                      : <User size={14} style={{ color: "#34d399" }} />
                    }
                  </div>
                  <div
                    className="flex-1 px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed"
                    style={
                      msg.role === "user"
                        ? { background: "rgba(79,70,229,0.25)", border: "1px solid rgba(129,140,248,0.3)", color: "rgba(255,255,255,0.9)", borderTopRightRadius: 4 }
                        : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", borderTopLeftRadius: 4 }
                    }
                  >
                    {msg.role === "assistant" ? formatAnswer(msg.content) : msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-xl shrink-0 flex items-center justify-center"
                    style={{ background: "rgba(79,70,229,0.3)", border: "1px solid rgba(129,140,248,0.3)" }}>
                    <Bot size={14} style={{ color: "#a5b4fc" }} />
                  </div>
                  <div className="px-3.5 py-2.5 rounded-2xl text-[13px] flex items-center gap-2"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", borderTopLeftRadius: 4 }}>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Analyzing compliance data...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick Questions */}
            <AnimatePresence>
              {showQuestions && !loading && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden shrink-0"
                >
                  <div className="px-4 pb-2 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold" style={{ color: "rgba(165,180,252,0.7)" }}>
                        Quick Questions
                      </span>
                      <button onClick={() => setShowQuestions(false)} style={{ color: "rgba(255,255,255,0.3)" }}>
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {PREDEFINED_QUESTIONS.slice(0, 6).map((q) => (
                        <button
                          key={q}
                          onClick={() => ask(q)}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all"
                          style={{
                            background: "rgba(129,140,248,0.12)",
                            border: "1px solid rgba(129,140,248,0.25)",
                            color: "#c4b5fd",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(129,140,248,0.22)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(129,140,248,0.12)")}
                        >
                          {q.length > 35 ? q.slice(0, 35) + "…" : q}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 px-3 py-3 shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about violations, rules, risks…"
                disabled={loading}
                className="flex-1 px-3.5 py-2.5 rounded-xl text-[13px] outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.9)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(129,140,248,0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)")}
              />
              <motion.button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: input.trim()
                    ? "linear-gradient(135deg, rgba(79,70,229,0.9), rgba(124,58,237,0.9))"
                    : "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  opacity: !input.trim() || loading ? 0.5 : 1,
                }}
                whileTap={{ scale: 0.92 }}
              >
                {loading ? <Loader2 size={16} color="white" className="animate-spin" /> : <Send size={16} color="white" />}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
