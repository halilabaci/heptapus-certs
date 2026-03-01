import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "HeptaCert — Gizlilik politikası ve kişisel veri yönetimi hakkında bilgi.",
};

export default function GizlilikPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="hover:text-brand-600 transition-colors">Ana Sayfa</Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">Gizlilik Politikası</span>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-card p-8 md:p-12 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">Hukuki Bilgilendirme</p>
          <h1 className="text-3xl font-extrabold text-gray-900">Gizlilik Politikası</h1>
          <p className="mt-2 text-sm text-gray-500">Son güncelleme: 1 Mart 2026</p>
        </div>

        <hr className="border-gray-100" />

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">1. Giriş</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Heptapus Group olarak gizliliğinize saygı duyuyor ve kişisel verilerinizin korunmasına önem veriyoruz.
            Bu Gizlilik Politikası, <strong>HeptaCert</strong> platformunu kullanırken verilerinizin nasıl toplandığını,
            kullanıldığını ve korunduğunu açıklamaktadır.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">2. Topladığımız Bilgiler</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">a) Hesap Bilgileri</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Kayıt olurken e-posta adresinizi ve şifrenizi alırız. Şifreniz şifrelenmiş (bcrypt hash) olarak saklanır; düz metin olarak hiçbir zaman tutulmaz.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">b) Platform Kullanım Verileri</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Oluşturduğunuz etkinlik, yüklediğiniz şablonlar, ürettiğiniz sertifikalar ve HeptaCoin işlem geçmişiniz platformda saklanır.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">c) Teknik Veriler</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Hizmetin güvenliğini sağlamak amacıyla IP adresi, tarayıcı bilgisi ve erişim logları işlenir.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">3. Çerezler (Cookies)</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Platform, oturum güvenliği için zorunlu çerezler kullanmaktadır. Reklam veya izleme amaçlı üçüncü taraf çerezleri kullanılmamaktadır.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">4. Veri Paylaşımı</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Verileriniz üçüncü taraflarla pazarlama amacıyla kesinlikle paylaşılmaz. Yalnızca aşağıdaki durumlarda sınırlı veri paylaşımı söz konusu olur:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed pl-2">
            <li>Hizmetin sağlanması için zorunlu altyapı sağlayıcıları (sunucu, e-posta)</li>
            <li>Ödeme işlemcisi (yalnızca işlem tutarı ve fatura referansı)</li>
            <li>Yasal zorunluluk halinde yetkili kamu kurumları</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">5. Veri Saklama Süreleri</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Hesap verileriniz aktif aboneliğiniz süresince ve akabinde yasal saklama yükümlülükleri gerektirdiği süre boyunca saklanır.
            Sertifika barındırma süresi, seçtiğiniz hosting planına ve sertifika bitiş tarihine bağlıdır. Hesabınızı silmeniz durumunda
            kişisel verileriniz, yükümlülük süreleri saklı kalmak kaydıyla 30 gün içinde anonimleştirilir veya silinir.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">6. Güvenlik</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Verilerinizin korunması için endüstri standardı güvenlik önlemleri uygulanmaktadır:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed pl-2">
            <li>HTTPS/TLS ile uçtan uca şifreli iletişim</li>
            <li>Şifrelenmiş şifre saklama (bcrypt)</li>
            <li>JWT tabanlı kısa ömürlü oturum tokenları</li>
            <li>İki faktörlü kimlik doğrulama (TOTP) desteği</li>
            <li>Oran sınırlama (rate limiting) ile brute-force koruması</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">7. Haklarınız</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            KVKK ve GDPR kapsamında kişisel verilerinize erişim, düzeltme, silme ve işlemeyi kısıtlama haklarına sahipsiniz.
            Detaylı bilgi için{" "}
            <Link href="/kvkk" className="text-brand-600 hover:underline">KVKK Aydınlatma Metnimizi</Link> inceleyebilir,
            taleplerinizi <a href="mailto:gizlilik@heptapusgroup.com" className="text-brand-600 hover:underline">gizlilik@heptapusgroup.com</a> adresine iletebilirsiniz.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">8. Politika Değişiklikleri</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Bu politikada önemli değişiklikler yapılması durumunda kayıtlı e-posta adresinize bildirim gönderilecektir.
            Değişikliklerin yürürlüğe girmesinden sonra platformu kullanmaya devam etmeniz, güncel politikayı kabul ettiğiniz anlamına gelir.
          </p>
        </section>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Gizlilik sorunları için</p>
            <a href="mailto:gizlilik@heptapusgroup.com" className="text-sm font-semibold text-brand-600 hover:underline">gizlilik@heptapusgroup.com</a>
          </div>
          <div className="flex gap-3">
            <Link href="/kvkk" className="text-sm text-gray-500 hover:text-brand-600 transition-colors">KVKK</Link>
            <Link href="/iletisim" className="text-sm text-gray-500 hover:text-brand-600 transition-colors">İletişim</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
