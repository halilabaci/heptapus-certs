import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İade ve İptal Politikası",
  description: "HeptaCert — HeptaCoin satın alımları için iade ve iptal koşulları.",
};

export default function IadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="hover:text-brand-600 transition-colors">Ana Sayfa</Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">İade ve İptal Politikası</span>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-card p-8 md:p-12 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">Hukuki Bilgilendirme</p>
          <h1 className="text-3xl font-extrabold text-gray-900">İade ve İptal Politikası</h1>
          <p className="mt-2 text-sm text-gray-500">Son güncelleme: 1 Mart 2026</p>
        </div>

        <hr className="border-gray-100" />

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">1. Genel Bilgi</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            HeptaCert platformunda hizmetler <strong>HeptaCoin</strong> adlı sanal birim üzerinden sunulmaktadır.
            Kullanıcılar HeptaCoin paketi satın alarak sertifika üretme, barındırma ve diğer platform hizmetlerinden yararlanır.
            Bu politika; HeptaCoin satın alımlarına ve abonelik planlarına ilişkin iade ve iptal koşullarını belirlemektedir.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">2. HeptaCoin Satın Alımları</h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-1">Kullanılmamış HeptaCoin İadesi</h3>
              <p className="text-sm text-amber-700 leading-relaxed">
                Satın alımdan itibaren <strong>14 takvim günü</strong> içinde ve HeptaCoin'lerin hiç kullanılmamış olması koşuluyla
                tam iade talep edebilirsiniz.
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Kısmen Kullanılmış Paketler</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Kısmen kullanılmış HeptaCoin paketleri için iade yapılmaz. Sertifika üretimi, doğrulama hizmeti veya barındırma
                için kullanılmış coin'ler geri alınamaz.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">3. İptal Koşulları</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Aktif aboneliğinizi istediğiniz zaman iptal edebilirsiniz. İptal işlemi:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed pl-2">
            <li>Mevcut ödeme döneminin sonuna kadar hizmetiniz aktif kalmaya devam eder</li>
            <li>Dönem sonunda otomatik yenileme durdurulur</li>
            <li>Kalan süre için kısmi iade yapılmaz</li>
            <li>Hesabınızdaki kullanılmamış HeptaCoin bakiyesi, hesap kapanmadıkça geçerliliğini korur</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">4. İade Süreci</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            İade talebinde bulunmak için:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 leading-relaxed pl-2">
            <li><a href="mailto:iade@heptapusgroup.com" className="text-brand-600 hover:underline">iade@heptapusgroup.com</a> adresine e-posta gönderin</li>
            <li>E-postanızda kayıtlı e-posta adresinizi, sipariş numaranızı ve iade gerekçenizi belirtin</li>
            <li>Talebiniz 3 iş günü içinde değerlendirilerek size bildirilir</li>
            <li>Onaylanan iadeler, ödemenin yapıldığı ödeme yöntemine 5-10 iş günü içinde yansıtılır</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">5. İade Kabul Edilmeyen Durumlar</h2>
          <p className="text-sm text-gray-600 leading-relaxed">Aşağıdaki durumlarda iade yapılmaz:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed pl-2">
            <li>14 günlük cayma süresi dolmuş satın alımlar</li>
            <li>Kısmen veya tamamen kullanılmış HeptaCoin paketleri</li>
            <li>Platform kullanım kurallarının ihlali sonucu sonlandırılan hesaplar</li>
            <li>Promosyon veya ücretsiz olarak verilen HeptaCoin bakiyeleri</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">6. Tüketici Hakları</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamındaki haklarınız saklıdır.
            Uyuşmazlık durumunda <Link href="/iletisim" className="text-brand-600 hover:underline">İletişim</Link> sayfasındaki
            adres üzerinden bizimle iletişime geçebilir veya Tüketici Hakem Heyetine başvurabilirsiniz.
          </p>
        </section>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">İade talepleri için</p>
            <a href="mailto:iade@heptapusgroup.com" className="text-sm font-semibold text-brand-600 hover:underline">iade@heptapusgroup.com</a>
          </div>
          <div className="flex gap-3">
            <Link href="/mesafeli-satis" className="text-sm text-gray-500 hover:text-brand-600 transition-colors">Mesafeli Satış Sözleşmesi</Link>
            <Link href="/iletisim" className="text-sm text-gray-500 hover:text-brand-600 transition-colors">İletişim</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
