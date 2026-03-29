'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { FeatureGate } from '@/lib/useSubscription';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/Admin/PageHeader';

export default function EmailDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    templates: 0,
    scheduled: 0,
    webhooks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch stats from various endpoints
        const [templatesRes, webhooksRes] = await Promise.all([
          apiFetch('/system/email-templates'),
          apiFetch('/admin/webhooks'),
        ]);

        const templatesData = await templatesRes.json();
        setStats(s => ({ ...s, templates: Array.isArray(templatesData) ? templatesData.length : 0 }));

        const webhooksData = await webhooksRes.json();
        setStats(s => ({ ...s, webhooks: Array.isArray(webhooksData) ? webhooksData.length : 0 }));
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const features = [
    {
      title: '⚙️ SMTP Ayarları',
      description: 'Email sunucunuzu yapılandırın (Gmail, Outlook, özel SMTP)',
      href: '/admin/email-settings',
      color: 'from-blue-500 to-blue-600',
      icon: '🔧',
      stats: 'Test Et & Doğrula'
    },
    {
      title: '📧 Email Şablonları',
      description: 'Canlı önizleme ile email şablonları oluşturun ve yönetin',
      href: '/admin/events',
      color: 'from-purple-500 to-purple-600',
      icon: '📝',
      stats: `${stats.templates} şablon`
    },
    {
      title: '📅 Email Zamanla',
      description: 'Hemen, belirli bir zamanda veya zamanlamayla (cron) email gönderin',
      href: '/admin/events',
      color: 'from-green-500 to-green-600',
      icon: '⏰',
      stats: 'Çoklu tetikleyici'
    },
    {
      title: '📊 Analitik & Teslimat',
      description: 'Email teslimat durumunu, açılma oranlarını ve geri dönme oranlarını takip edin',
      href: '/admin/email-analytics',
      color: 'from-orange-500 to-orange-600',
      icon: '📈',
      stats: 'Gerçek zamanlı'
    },
    {
      title: '🪝 Webhooklar',
      description: 'Email olaylarına abone olun ve harici sistemlerle entegre edin',
      href: '/admin/webhooks',
      color: 'from-red-500 to-red-600',
      icon: '🔗',
      stats: `${stats.webhooks} aktif webhook`
    },
    {
      title: '📬 Abonelik İptali',
      description: 'Katılımcılar toplu emaillerden aboneliklerini iptal edebilir',
      href: '#',
      color: 'from-gray-600 to-gray-700',
      icon: '✋',
      stats: 'Token tabanlı sistem',
      disabled: true
    }
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Email Dashboard"
        subtitle="SMTP yapılandırma, zamanlama, analitik ve webhook entegrasyonu"
        icon={<Mail className="h-5 w-5" />}
      />

      {/* Stats Row */}
      <div className="max-w-7xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6 border-l-4 border-blue-500">
          <div className="text-3xl font-bold text-blue-600">{stats.templates}</div>
          <p className="text-surface-500">Email Şablonları</p>
        </div>
        <div className="card p-6 border-l-4 border-purple-500">
          <div className="text-3xl font-bold text-purple-600">∞</div>
          <p className="text-surface-500">Zamanlanmış İşler</p>
        </div>
        <div className="card p-6 border-l-4 border-red-500">
          <div className="text-3xl font-bold text-red-600">{stats.webhooks}</div>
          <p className="text-surface-500">Aktif Webhook</p>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-surface-900 mb-8">Temel Özellikler</h2>
        <FeatureGate requiredPlans={["growth","enterprise"]}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className={`rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                  feature.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <Link href={feature.disabled ? '#' : feature.href}>
                  <div className={`bg-gradient-to-br ${feature.color} h-32 flex flex-col justify-between p-6 text-white`}>
                    <div className="text-4xl">{feature.icon}</div>
                    <div>
                      <h3 className="text-lg font-bold">{feature.title}</h3>
                    </div>
                  </div>
                </Link>
                
                <div className="card p-6">
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">{feature.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{feature.stats}</span>
                    {!feature.disabled && (
                      <Link href={feature.href} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-semibold">
                        Aç →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FeatureGate>
      </div>

      {/* Quick Start Guide */}
      <div className="max-w-7xl mx-auto mt-12">
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-8">
          <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200 mb-4">🚀 Hızlı Başlangıç Kılavuzu</h3>
          <ol className="text-blue-800 dark:text-blue-300 space-y-2 list-decimal list-inside">
            <li><strong>Adım 1:</strong> Email sunucunuzu yapılandırmak için <Link href="/admin/email-settings" className="text-blue-600 dark:text-blue-400 hover:underline">SMTP Ayarları</Link>&apos;na gidin</li>
            <li><strong>Adım 2:</strong> SMTP kimlik bilgilerinizin çalıştığını doğrulamak için &quot;Bağlantıyı Test Et&quot;&apos;e tıklayın</li>
            <li><strong>Adım 3:</strong> Bir etkinliğe gidin ve <Link href="/admin/events" className="text-blue-600 dark:text-blue-400 hover:underline">önizleme</Link> ile email şablonu oluşturun</li>
            <li><strong>Adım 4:</strong> <Link href="/admin/events" className="text-blue-600 dark:text-blue-400 hover:underline">Emailleri zamanlayın</Link>: hemen veya zamanlama (cron) ile gönderin</li>
            <li><strong>Adım 5:</strong> <Link href="/admin/email-analytics" className="text-blue-600 dark:text-blue-400 hover:underline">Analitik</Link> paneli ile teslimatı izleyin</li>
            <li><strong>Adım 6:</strong> Slack, Zapier vb. ile entegrasyon için <Link href="/admin/webhooks" className="text-blue-600 dark:text-blue-400 hover:underline">webhookları</Link> kurun</li>
          </ol>
        </div>
      </div>

      {/* Supported Events */}
      <div className="max-w-7xl mx-auto mt-12">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">🔔 Webhook Olayları</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <p className="font-semibold text-green-700 dark:text-green-400">email.sent</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Email başarıyla iletildiğinde tetiklenir</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4 py-2">
              <p className="font-semibold text-red-700 dark:text-red-400">email.failed</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Email teslimatı başarısız olduğunda tetiklenir</p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4 py-2">
              <p className="font-semibold text-yellow-700 dark:text-yellow-400">email.bounced</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Alıcı tarafından email reddedildiğinde tetiklenir</p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="font-semibold text-blue-700 dark:text-blue-400">email.opened</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Alıcı emaili açtığında tetiklenir</p>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="max-w-7xl mx-auto mt-12 mb-12">
        <div className="bg-gradient-to-r from-indigo-50 dark:from-indigo-900/20 to-blue-50 dark:to-blue-900/20 rounded-lg p-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">💡 Teknoloji Altyapısı</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Email</p>
              <p className="text-gray-600 dark:text-gray-400">SMTP via aiosmtplib</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Zamanlama</p>
              <p className="text-gray-600 dark:text-gray-400">APScheduler (cron/datetime)</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Webhooklar</p>
              <p className="text-gray-600 dark:text-gray-400">HMAC-SHA256 imzalama</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Takip</p>
              <p className="text-gray-600 dark:text-gray-400">PostgreSQL + Teslimat logları</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
