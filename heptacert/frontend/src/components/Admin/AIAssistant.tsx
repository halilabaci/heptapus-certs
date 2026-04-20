"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, AlertCircle, Lightbulb } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Message {
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}

// FAQ Bilgi Tabanı
const FAQ_DATABASE = {
  tr: [
    {
      keywords: ["form", "alan", "registration", "field"],
      answer: "Form alanlarını eklemek için Etkinlik Ayarları > Kayıt Formu bölümüne gidin. '+Alan Ekle' butonunu tıklayarak yeni alanlar oluşturabilirsiniz. Her alan için türünü (metin, e-posta, tarih vb.), etiketini ve yardımcı metni belirleyebilirsiniz."
    },
    {
      keywords: ["sertifika", "certificate", "template"],
      answer: "Sertifika şablonlarını Editor sayfasında özelleştirebilirsiniz. Şablonlara arka plan, logoları, metinleri ve tarzları ekleyebilirsiniz. Önizleme alanında değişiklikleri hemen görebilirsiniz."
    },
    {
      keywords: ["attendee", "katılımcı", "participant", "member"],
      answer: "Katılımcılar bölümünde etkinliğinize kayıtlı tüm üyeleri görebilirsiniz. Katılımcı durumunu değiştirebilir, sertifika verişini yönetebilir veya toplu işlemler yapabilirsiniz."
    },
    {
      keywords: ["email", "posta", "notification", "bildirim"],
      answer: "E-posta ayarlarını Etkinlik Ayarları > E-posta bölümünde yapılandırabılırsinız. Otomatik sertifika e-postalarını özelleştirebilir, SMTP ayarlarını belirleyebilirsiniz."
    },
    {
      keywords: ["raffle", "çekiliş", "draw", "prize"],
      answer: "Çekiliş oluşturmak için Çekiliş sayfasına gidin. Prize ekleyin, katılımcı kurallarını belirleyin ve otomatik olarak kazananları seçtirebilirsiniz."
    },
    {
      keywords: ["survey", "anket", "question"],
      answer: "Anketleri Etkinlik Ayarları > Anket bölümünde oluşturabilirsiniz. Soruları ekleyin, türlerini seçin (metin, çoktan seçme vb.) ve katılımcılar tarafından cevaplanmasını sağlayabilirsiniz."
    },
    {
      keywords: ["session", "oturum", "schedule", "timetable"],
      answer: "Oturumları Oturumlar sayfasından ekleyebilirsiniz. Her oturumun tarihini, saatini ve başlığını belirleyebilirsiniz. Check-in sistemi otomatik olarak oturumlara göre çalışır."
    },
    {
      keywords: ["analytics", "istatistik", "report", "data"],
      answer: "Analytics bölümünde etkinliğinizin kapsamlı istatistiklerini görebilirsiniz. Kayıt sayıları, katılımcı dağılımı, sertifika durumu ve daha fazlasını analiz edebilirsiniz."
    }
  ],
  en: [
    {
      keywords: ["form", "field", "registration", "input"],
      answer: "To add form fields, go to Event Settings > Registration Form. Click '+Add Field' to create new fields. You can set the field type (text, email, date, etc.), label, and helper text for each field."
    },
    {
      keywords: ["certificate", "template", "cert"],
      answer: "Customize certificate templates in the Editor page. You can add backgrounds, logos, text, and styling. See changes in real-time in the preview area."
    },
    {
      keywords: ["attendee", "participant", "member", "user"],
      answer: "In the Attendees section, you can view all registered members for your event. You can change attendee status, manage certificate issuance, or perform bulk operations."
    },
    {
      keywords: ["email", "mail", "notification", "smtp"],
      answer: "Configure email settings in Event Settings > Email. Customize automatic certificate emails and set up your SMTP configuration."
    },
    {
      keywords: ["raffle", "draw", "prize", "winner"],
      answer: "Create raffles in the Raffles page. Add prizes, set participant rules, and automatically select winners."
    },
    {
      keywords: ["survey", "questionnaire", "question", "poll"],
      answer: "Create surveys in Event Settings > Survey. Add questions, choose types (text, multiple choice, etc.), and enable participants to answer them."
    },
    {
      keywords: ["session", "schedule", "timetable", "timing"],
      answer: "Add sessions from the Sessions page. Set the date, time, and title for each session. The check-in system automatically works based on sessions."
    },
    {
      keywords: ["analytics", "statistics", "report", "data", "metrics"],
      answer: "View comprehensive statistics of your event in the Analytics section. Analyze registration numbers, participant distribution, certificate status, and more."
    }
  ]
};

export default function AIAssistant() {
  const { lang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      message: lang === "tr" ? "Merhaba! Size etkinlik oluşturma ve yönetiminde yardımcı olmak için buradayım. Ne sorunuz var?" : "Hello! I'm here to help you with event creation and management. What questions do you have?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState("");
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findAnswer = (userMessage: string): string | null => {
    const faqDb = FAQ_DATABASE[lang as keyof typeof FAQ_DATABASE];
    const lowerMsg = userMessage.toLowerCase();

    for (const faq of faqDb) {
      if (faq.keywords.some(keyword => lowerMsg.includes(keyword))) {
        return faq.answer;
      }
    }
    return null;
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // Add user message
    const userMsg: Message = {
      role: "user",
      message: input,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // Find answer
    const answer = findAnswer(input);
    
    // Add assistant response
    const assistantMsg: Message = {
      role: "assistant",
      message: answer || (lang === "tr" ? "Maalesef bu soruya yanıt bulamadım. Lütfen 'Destek Talebi Aç' butonunu kullanarak detaylı açıklamayı yapınız." : "Sorry, I couldn't find an answer to this question. Please use 'Create Support Ticket' button for more details."),
      timestamp: new Date().toISOString()
    };
    
    setTimeout(() => {
      setMessages(prev => [...prev, assistantMsg]);
    }, 300);
  };

  const handleCreateSupport = async () => {
    if (!supportSubject.trim() || !supportMessage.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: supportSubject,
          message: supportMessage
        })
      });

      if (response.ok) {
        // Success
        const assistantMsg: Message = {
          role: "assistant",
          message: lang === "tr" ? "✅ Destek talebiniz başarıyla oluşturuldu! Superadmin ekibimiz en kısa sürede yanıtlayacak." : "✅ Your support ticket has been created successfully! Our support team will respond soon.",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
        setSupportSubject("");
        setSupportMessage("");
        setShowSupportForm(false);
      } else {
        const error = await response.json();
        const assistantMsg: Message = {
          role: "assistant",
          message: lang === "tr" ? `❌ Hata: ${error.detail || "Destek talebini oluşturmada hata oluştu"}` : `❌ Error: ${error.detail || "Failed to create support ticket"}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error) {
      const assistantMsg: Message = {
        role: "assistant",
        message: lang === "tr" ? "❌ Bağlantı hatası. Lütfen daha sonra tekrar deneyin." : "❌ Connection error. Please try again later.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 flex items-center justify-center h-14 w-14 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition z-40"
          title={lang === "tr" ? "AI Asistan" : "AI Assistant"}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-surface-200">
          {/* Header */}
          <div className="bg-brand-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              <h3 className="font-semibold">
                {lang === "tr" ? "HeptaCert AI Asistan" : "HeptaCert AI Assistant"}
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-brand-700 p-1 rounded-lg transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2.5 rounded-lg text-sm ${
                    msg.role === "user"
                      ? "bg-brand-600 text-white rounded-br-none"
                      : "bg-white text-surface-900 border border-surface-200 rounded-bl-none"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Support Form */}
          {showSupportForm && (
            <div className="border-t border-surface-200 p-4 space-y-3 bg-amber-50">
              <div className="flex items-start gap-2 p-3 bg-amber-100 rounded-lg text-sm text-amber-900">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  {lang === "tr"
                    ? "Sorununuzu detaylı açıklayın. Superadmin ekibimiz yanıtlayacak."
                    : "Describe your issue in detail. Our support team will respond."}
                </p>
              </div>
              
              <input
                type="text"
                placeholder={lang === "tr" ? "Konu..." : "Subject..."}
                value={supportSubject}
                onChange={(e) => setSupportSubject(e.target.value)}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                disabled={loading}
              />
              
              <textarea
                placeholder={lang === "tr" ? "Mesajınız..." : "Your message..."}
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                disabled={loading}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSupportForm(false)}
                  className="flex-1 px-3 py-2 border border-surface-300 rounded-lg text-sm font-medium text-surface-700 hover:bg-surface-100 transition disabled:opacity-50"
                  disabled={loading}
                >
                  {lang === "tr" ? "İptal" : "Cancel"}
                </button>
                <button
                  onClick={handleCreateSupport}
                  className="flex-1 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-50"
                  disabled={loading || !supportSubject.trim() || !supportMessage.trim()}
                >
                  {loading ? (lang === "tr" ? "Gönderiliyor..." : "Sending...") : (lang === "tr" ? "Gönder" : "Send")}
                </button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-surface-200 p-4 space-y-2">
            {!showSupportForm ? (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={lang === "tr" ? "Sorunuzu sorun..." : "Ask your question..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1 px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim()}
                    className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => setShowSupportForm(true)}
                  className="w-full px-3 py-2 border border-amber-300 bg-amber-50 text-amber-900 rounded-lg text-sm font-medium hover:bg-amber-100 transition"
                >
                  {lang === "tr" ? "❌ Çözümü bulamadım - Destek Talebi Aç" : "❌ Can't find solution - Create Support Ticket"}
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
