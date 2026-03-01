import Link from "next/link";
import type { Metadata } from "next";
import { Mail, Globe, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "İletişim",
  description: "HeptaCert — Destek, iş geliştirme ve hukuki talepler için iletişim bilgileri.",
};

export default function IletisimPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="hover:text-brand-600 transition-colors">Ana Sayfa</Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">İletişim</span>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-card p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">Bize Ulaşın</p>
          <h1 className="text-3xl font-extrabold text-gray-900">İletişim</h1>
          <p className="mt-3 text-base text-gray-500 max-w-xl leading-relaxed">
            Platform desteği, iş birlikleri veya hukuki talepler için aşağıdaki kanalları kullanabilirsiniz.
            Mesajınızı en kısa sürede değerlendirip size geri döneceğiz.
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-gray-100 bg-white shadow-card p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Genel Destek</p>
                <p className="text-sm font-bold text-gray-800">E-posta</p>
              </div>
            </div>
            <a href="mailto:contact@heptapusgroup.com"
              className="block text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors">
              contact@heptapusgroup.com
            </a>
            <p className="text-xs text-gray-500 leading-relaxed">
              Hesap sorunları, ödeme, teknik destek ve genel sorularınız için.
              Yanıt süresi: 1–2 iş günü.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-card p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Ana Site</p>
                <p className="text-sm font-bold text-gray-800">Heptapus Group</p>
              </div>
            </div>
            <a href="https://heptapusgroup.com" target="_blank" rel="noopener noreferrer"
              className="block text-sm font-semibold text-violet-600 hover:text-violet-700 hover:underline transition-colors">
              heptapusgroup.com
            </a>
            <p className="text-xs text-gray-500 leading-relaxed">
              Heptapus Group bünyesindeki tüm ürünler ve şirket hakkında bilgi almak için ziyaret edin.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-card p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Hukuki & KVKK</p>
                <p className="text-sm font-bold text-gray-800">Yasal Talepler</p>
              </div>
            </div>
            <a href="mailto:legal@heptapusgroup.com"
              className="block text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors">
              legal@heptapusgroup.com
            </a>
            <p className="text-xs text-gray-500 leading-relaxed">
              KVKK başvuruları, gizlilik talepleri ve hukuki bildirimler için.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-card p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">İade & Ödeme</p>
                <p className="text-sm font-bold text-gray-800">Finans Destek</p>
              </div>
            </div>
            <a href="mailto:iade@heptapusgroup.com"
              className="block text-sm font-semibold text-amber-600 hover:text-amber-700 hover:underline transition-colors">
              iade@heptapusgroup.com
            </a>
            <p className="text-xs text-gray-500 leading-relaxed">
              İade talepleri, fatura itirazları ve ödeme sorunları için.
            </p>
          </div>
        </div>

        {/* Response time info */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-card p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">Yanıt Süreleri</h2>
          <div className="space-y-3">
            {[
              { channel: "Teknik Destek", time: "1–2 iş günü", color: "bg-brand-100 text-brand-700" },
              { channel: "İade Talebi", time: "3 iş günü", color: "bg-amber-100 text-amber-700" },
              { channel: "KVKK / Hukuki", time: "30 gün (yasal süre)", color: "bg-emerald-100 text-emerald-700" },
              { channel: "İş Geliştirme", time: "3–5 iş günü", color: "bg-violet-100 text-violet-700" },
            ].map((item) => (
              <div key={item.channel} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.channel}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.color}`}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Legal links */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Yasal Belgeler</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/kvkk", label: "KVKK Aydınlatma Metni" },
              { href: "/gizlilik", label: "Gizlilik Politikası" },
              { href: "/iade", label: "İade ve İptal Politikası" },
              { href: "/mesafeli-satis", label: "Mesafeli Satış Sözleşmesi" },
            ].map((link) => (
              <Link key={link.href} href={link.href}
                className="text-sm text-gray-600 hover:text-brand-600 transition-colors hover:underline">
                → {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
