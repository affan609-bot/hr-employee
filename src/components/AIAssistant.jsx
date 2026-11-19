import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';
import {
  Sparkles, Send, X, Bot, User, ShieldCheck,
  AlertCircle, Calendar, ArrowRight, CornerDownLeft, RefreshCw
} from 'lucide-react';

export default function AIAssistant({ isOpen, onClose, onApplySmartLeave }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hello ${user?.name || ''}! I am your HCM Lite AI Assistant. I can answer questions from real database records, clarify company HR policies, summarize dashboard metrics, or pre-fill smart leave requests. How can I help you today?`,
      toolUsed: null,
      aiGenerated: true
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (textToSend) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || loading) return;

    const userMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: promptText
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Check if user is asking for smart leave (e.g. contains "off", "leave", "chutti", "wedding", "sick")
      const lower = promptText.toLowerCase();
      const isLeaveIntent = user?.role === 'employee' && (
        lower.includes('off') ||
        lower.includes('leave') ||
        lower.includes('chutti') ||
        lower.includes('wedding') ||
        lower.includes('shadi') ||
        lower.includes('fever') ||
        lower.includes('vacation')
      ) && (
        lower.includes('need') ||
        lower.includes('want') ||
        lower.includes('chahiye') ||
        lower.includes('apply') ||
        lower.includes('next') ||
        lower.includes('tomorrow') ||
        lower.includes('kal')
      );

      if (isLeaveIntent) {
        const smartRes = await api.smartLeave(promptText);
        setMessages(prev => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            role: 'assistant',
            text: `I've prepared a leave request based on your words:\n\n• **Leave Type:** ${smartRes.leaveTypeName}\n• **From:** ${smartRes.startDate}\n• **To:** ${smartRes.endDate}\n• **Reason:** ${smartRes.reason}`,
            toolUsed: 'smart_leave',
            smartLeaveData: smartRes,
            aiGenerated: true
          }
        ]);
        setLoading(false);
        return;
      }

      // Normal chat query with tool execution
      const res = await api.askAI(promptText);
      setMessages(prev => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          text: res.answer,
          toolUsed: res.toolUsed,
          aiGenerated: res.aiGenerated
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          role: 'assistant',
          text: `Error: ${err.message || 'Failed to process AI request. Please try again.'}`,
          isError: true,
          aiGenerated: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getQuickQuestions = () => {
    if (user?.role === 'admin' || user?.role === 'hr') {
      return [
        'How many active employees are in the company?',
        'Who came late most often this month?',
        'What is this month’s attendance rate?',
        'What is the company gross salary policy?',
        'Who is on leave today?'
      ];
    }
    return [
      'How many sick leaves do I have left this year?',
      "What is my colleague's salary?",
      'Need next Monday and Tuesday off for a wedding',
      'What are the office hours and grace time?',
      'Meri kitni chuttiyan baqi hain?'
    ];
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 z-50 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              HCM Assistant
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                {user?.role}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Real-time data & HR policy Q&A</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
              m.role === 'user'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 rounded-tr-none'
                : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
            }`}>
              {m.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI-Generated
                  </span>
                  {m.toolUsed && (
                    <span className="text-[10px] font-mono bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                      tool: {m.toolUsed}
                    </span>
                  )}
                </div>
              )}

              <div className="whitespace-pre-wrap">{m.text}</div>

              {/* Action button if Smart Leave was generated */}
              {m.smartLeaveData && onApplySmartLeave && (
                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <button
                    onClick={() => {
                      onApplySmartLeave(m.smartLeaveData);
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Review & Confirm in Leave Form
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              Checking database & generating response...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions */}
      <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
          Suggested Prompts
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {getQuickQuestions().map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={loading}
              className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={user?.role === 'employee' ? "Ask policy, leave balance, or type 'need Monday off'..." : "Ask headcount, late comers, attendance..."}
          className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-md transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
