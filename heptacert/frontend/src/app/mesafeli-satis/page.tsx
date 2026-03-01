import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi",
  description: "HeptaCert — HeptaCoin ve abonelik satın alımlarına ilişkin mesafeli satış sözleşmesi.",
};

export default function MesafeliSatisPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="hover:text-brand-600 transition-colors">Ana Sayfa</Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">Mesafeli Satış Sözleşmesi</span>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-card p-8 md:p-12 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">Hukuki Belge</p>
          <h1 className="text-3xl font-extrabold text-gray-900">Mesafeli Satış Sözleşmesi</h1>
          <p className="mt-2 text-sm text-gray-500">Son güncelleme: 1 Mart 2026</p>
        </div>

        <hr className="border-gray-100" />

        {/* Taraflar */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Madde 1 — Taraflar</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-1">
              <p className="text-xs font-semibold uppercase text-gray-400 tracking-widest">Satıcı</p>
              <p className="text-sm font-semibold text-gray-800">Heptapus Group</p>
              <p className="text-sm text-gray-600">E-posta: contact@heptapusgroup.com</p>
              <p className="text-sm text-gray-600">Web: heptapusgroup.com</p>
            </div>
            <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 space-y-1">
              <p className="text-xs font-semibold uppercase text-brand-400 tracking-widest">Alıcı (Tüketici)</p>
              <p className="text-sm text-brand-800">Kayıt sırasında bildirilen bilgilere sahip kullanıcı</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">Madde 2 — Sözleşmenin Konusu</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            İşbu sözleşme, Alıcının <strong>cert.heptapusgroup.com</strong> platformu üzerinden dijital hizmet ve sanal birim (HeptaCoin)
            satın almasına ilişkin koşulları, tarafların hak ve yükümlülüklerini, 6502 sayılı Tüketicinin Korunması Hakkında Kanun
            ve Mesafeli Sözleşmeler Yönetmeliği çerçevesinde düzenler.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">Madde 3 — Ürün / Hizmet Bilgileri</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 pr-4 text-gray-700 font-semibold">Hizmet</th>
                  <th className="py-2 text-gray-700 font-semibold">Açıklama</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 divide-y divide-gray-100">
                <tr>
                  <td className="py-2 pr-4 font-medium">HeptaCoin Paketi</td>
                  <td className="py-2">Platform hizmetlerinde kullanılacak sanal birim</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Abonelik Planı</td>
                  <td className="py-2">Aylık/yıllık HeptaCoin kotası ve premium özellikler</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Sertifika Barındırma</td>
                  <td className="py-2">Üretilen sertifika PDF'lerinin çevrimiçi erişilebilir tutulması</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">Madde 4 — Ödeme</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Satın alım bedeli, sipariş sırasında gösterilen fiyattır ve KDV dahildir. Ödeme; kredi kartı, banka kartı veya desteklenen
            diğer ödeme yöntemleri ile güvenli ödeme altyapısı üzerinden peşin olarak tahsil edilir.
            Satıcı, fiyat değişikliği hakkını saklı tutar; ancak onaylanmış siparişlere atanan fiyat değiştirilemez.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">Madde 5 — Teslimat</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Satın alım işleminin tamamlanmasının ardından HeptaCoin bakiyesi veya abonelik hakları hesabınıza
            <strong> anında</strong> tanımlanır. Dijital hizmet niteliğinde olduğundan fiziksel teslimat bulunmamaktadır.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">Madde 6 — Cayma Hakkı</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Mesafeli Sözleşmeler Yönetmeliği md. 16/1(ğ) uyarınca; teslim anında ifası başlayan dijital içerik ve hizmetler için
            alıcı tarafından açık onay verilmesi ve teslimata başlansa dahi cayma hakkının ortadan kalkacağının kabul edilmesi
            koşuluyla cayma hakkı kullanılamaz.
          </p>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>Önemli:</strong> Satın alım sırasında cayma hakkının kullanılamayacağını kabul ettiğinize dair onay
              kutucuğunu işaretlemeniz, bu koşulların geçerliliği için zorunludur. Kullanılmamış HeptaCoin için 14 gün içinde
              gönüllü iade politikamız geçerlidir; detaylar için <Link href="/iade" className="text-amber-700 font-semibold hover:underline">İade Politikasını</Link> inceleyin.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">Madde 7 — Satıcının Yükümlülükleri</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed pl-2">
            <li>Platform hizmetini sürekli ve erişilebilir tutmak için gerekli teknik altyapıyı sağlamak</li>
            <li>Teknik arıza durumlarında makul sürede müdahale etmek</li>
            <li>Kişisel verileri KVKK ve gizlilik politikası doğrultusunda işlemek</li>
            <li>Fatura / makbuz bilgilerini yasal süre boyunca saklamak</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">Madde 8 — Alıcının Yükümlülükleri</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 leading-relaxed pl-2">
            <li>Platforma doğru ve eksiksiz bilgi ile kayıt olmak</li>
            <li>Hesap güvenliğini korumak, şifresini üçüncü taraflarla paylaşmamak</li>
            <li>Platformu münhasıran yasal amaçlarla ve <Link href="/gizlilik" className="text-brand-600 hover:underline">kullanım koşulları</Link> çerçevesinde kullanmak</li>
            <li>Başkalarına ait kişisel verileri izinsiz işlememek</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">Madde 9 — Uyuşmazlık Çözümü</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            İşbu sözleşmeden doğan uyuşmazlıklarda Türk Hukuku uygulanır. Tüketici sıfatıyla uyuşmazlık yaşanması halinde
            ikamet ettiğiniz yerdeki Tüketici Hakem Heyeti veya Tüketici Mahkemesi yetkilidir. Tüccar kullanıcılar için
            İstanbul Çağlayan Mahkemeleri yetkili kılınmıştır.
          </p>
        </section>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Sözleşme sorularınız için</p>
            <a href="mailto:legal@heptapusgroup.com" className="text-sm font-semibold text-brand-600 hover:underline">legal@heptapusgroup.com</a>
          </div>
          <div className="flex gap-3">
            <Link href="/iade" className="text-sm text-gray-500 hover:text-brand-600 transition-colors">İade Politikası</Link>
            <Link href="/kvkk" className="text-sm text-gray-500 hover:text-brand-600 transition-colors">KVKK</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
