import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "HeptaCert — Kişisel Verilerin Korunması Kanunu kapsamında kişisel verilerinizin işlenmesine ilişkin aydınlatma metni.",
};

export default function KVKKPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="hover:text-brand-600 transition-colors">Ana Sayfa</Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">KVKK Aydınlatma Metni</span>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-card p-8 md:p-12 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">Hukuki Bilgilendirme</p>
          <h1 className="text-3xl font-extrabold text-gray-900">KVKK Aydınlatma Metni</h1>
          <p className="mt-2 text-sm text-gray-500">Son güncelleme: 1 Mart 2026</p>
        </div>

        <hr className="border-gray-100" />

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">1. Veri Sorumlusu</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca kişisel verileriniz, veri sorumlusu sıfatıyla{" "}
            <strong>Heptapus Group</strong> ("Şirket") tarafından aşağıda açıklanan kapsamda işlenmektedir.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">2. İşlenen Kişisel Veriler</h2>
          <p className="text-sm text-gray-600 leading-relaxed">Platformumuz aracılığıyla işlenen kişisel veriler şunlardır:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed pl-2">
            <li><strong>Kimlik bilgileri:</strong> Ad, soyad</li>
            <li><strong>İletişim bilgileri:</strong> E-posta adresi</li>
            <li><strong>İşlem bilgileri:</strong> Platform kullanım geçmişi, üretilen sertifika kayıtları</li>
            <li><strong>Ödeme bilgileri:</strong> Fatura bilgileri (ödeme kart bilgileri tarafımızdan tutulmaz; güvenli ödeme altyapısı üzerinden işlenir)</li>
            <li><strong>Log verileri:</strong> IP adresi, tarayıcı türü, erişim zamanı</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">3. Kişisel Verilerin İşlenme Amaçları</h2>
          <p className="text-sm text-gray-600 leading-relaxed">Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed pl-2">
            <li>Hesap oluşturma ve kimlik doğrulama işlemlerinin gerçekleştirilmesi</li>
            <li>Platform hizmetlerinin sunulması ve devamlılığının sağlanması</li>
            <li>Sertifika üretimi, yönetimi ve doğrulama hizmetlerinin yerine getirilmesi</li>
            <li>Faturalandırma ve ödeme işlemlerinin gerçekleştirilmesi</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi</li>
            <li>Teknik destek ve müşteri hizmetlerinin yürütülmesi</li>
            <li>Güvenlik ve dolandırıcılık önleme faaliyetlerinin sürdürülmesi</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">4. Kişisel Verilerin Aktarılması</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Kişisel verileriniz; hizmetin ifası için zorunlu olan altyapı sağlayıcıları (bulut sunucu, e-posta servisi, ödeme altyapısı) ile
            yasal zorunluluk halinde yetkili kamu kurum ve kuruluşlarına aktarılabilir. Üçüncü taraflarla yalnızca veri işleme sözleşmesi
            çerçevesinde ve KVKK'ya uygun şekilde çalışılmaktadır.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">5. Kişisel Veri Toplama Yöntemi ve Hukuki Sebebi</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Kişisel verileriniz; platform üzerinden elektronik yollarla toplanmaktadır. Hukuki dayanak olarak başta KVKK md. 5/2(c)
            (sözleşmenin kurulması veya ifası) ve md. 5/2(f) (meşru menfaat) olmak üzere ilgili hukuki sebepler esas alınmaktadır.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">6. İlgili Kişi Hakları</h2>
          <p className="text-sm text-gray-600 leading-relaxed">KVKK md. 11 uyarınca aşağıdaki haklara sahipsiniz:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed pl-2">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenmişse bilgi talep etme</li>
            <li>İşlenme amacını ve bu amaca uygun kullanılıp kullanılmadığını öğrenme</li>
            <li>Yurt içi veya yurt dışında aktarıldığı üçüncü kişileri öğrenme</li>
            <li>Eksik veya yanlış işlenmiş ise düzeltilmesini isteme</li>
            <li>Silinmesini veya yok edilmesini isteme</li>
            <li>Aktarılan üçüncü kişilere bildirilmesini isteme</li>
            <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
            <li>Kanuna aykırı işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
          </ul>
          <p className="text-sm text-gray-600 leading-relaxed">
            Bu haklarınızı kullanmak için <a href="mailto:kvkk@heptapusgroup.com" className="text-brand-600 hover:underline">kvkk@heptapusgroup.com</a> adresine
            yazılı başvurabilirsiniz.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">7. Veri Güvenliği</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Kişisel verilerinizin korunması için teknik ve idari tedbirler alınmaktadır. Şifreli iletişim (HTTPS/TLS), şifreli şifre saklama
            (bcrypt), JWT tabanlı oturum yönetimi ve düzenli yedekleme bu tedbirler arasındadır.
          </p>
        </section>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Sorularınız için</p>
            <a href="mailto:kvkk@heptapusgroup.com" className="text-sm font-semibold text-brand-600 hover:underline">kvkk@heptapusgroup.com</a>
          </div>
          <div className="flex gap-3">
            <Link href="/gizlilik" className="text-sm text-gray-500 hover:text-brand-600 transition-colors">Gizlilik Politikası</Link>
            <Link href="/iletisim" className="text-sm text-gray-500 hover:text-brand-600 transition-colors">İletişim</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
