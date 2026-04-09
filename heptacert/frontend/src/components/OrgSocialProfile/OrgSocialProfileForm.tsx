import React, { useState } from 'react';
import { ImagePlus, Link as LinkIcon, Save } from 'lucide-react';

export interface OrgSocialProfileData {
  bio: string;
  banner_url?: string;
  website?: string;
  github_url?: string;
  instagram_handle?: string;
  contact_email?: string;
}

interface OrgSocialProfileFormProps {
  initialData: OrgSocialProfileData;
  onSubmit: (data: OrgSocialProfileData) => Promise<void>;
  isLoading?: boolean;
  orgName: string;
}

export default function OrgSocialProfileForm({
  initialData,
  onSubmit,
  isLoading = false,
  orgName,
}: OrgSocialProfileFormProps) {
  const [formData, setFormData] = useState<OrgSocialProfileData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(initialData.banner_url || null);

  const handleChange = (field: keyof OrgSocialProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Banner dosyası 5MB\'dan küçük olmalıdır');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Lütfen bir resim dosyası seçin');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setBannerPreview(result);
        setFormData((prev) => ({ ...prev, banner_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bio.trim()) {
      setError('Lütfen bir topluluk açıklaması yazın');
      return;
    }

    if (formData.bio.length > 500) {
      setError('Açıklama 500 karakteri aşamaz');
      return;
    }

    try {
      setError(null);
      await onSubmit(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      {/* Banner Upload */}
      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">
          Topluluk Banneri
        </label>
        <div className="relative rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-slate-400 transition">
          {bannerPreview && (
            <div className="absolute inset-0 rounded-lg overflow-hidden">
              <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover opacity-50" />
            </div>
          )}
          <div className="relative z-10">
            <ImagePlus className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <input
              type="file"
              accept="image/*"
              onChange={handleBannerChange}
              disabled={isLoading}
              className="sr-only"
              id="banner-input"
            />
            <label htmlFor="banner-input" className="cursor-pointer">
              <p className="text-sm font-medium text-slate-600">Resim yükle veya sürükle</p>
              <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF - Max 5MB</p>
            </label>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">
          Topluluk Açıklaması
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) => handleChange('bio', e.currentTarget.value)}
          placeholder="Topluluğunuzun amacı ve özelliklerini anlatın..."
          rows={4}
          maxLength={500}
          disabled={isLoading}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
        />
        <p className="mt-1 text-xs text-slate-500">{formData.bio.length} / 500</p>
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">
          Web Sitesi
        </label>
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-slate-400" />
          <input
            type="url"
            value={formData.website || ''}
            onChange={(e) => handleChange('website', e.currentTarget.value)}
            placeholder="https://example.com"
            disabled={isLoading}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
          />
        </div>
      </div>

      {/* GitHub */}
      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">
          GitHub Profili
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">github.com/</span>
          <input
            type="text"
            value={formData.github_url || ''}
            onChange={(e) => handleChange('github_url', e.currentTarget.value)}
            placeholder="username"
            disabled={isLoading}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
          />
        </div>
      </div>

      {/* Instagram */}
      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">
          Instagram Hesabı
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">@</span>
          <input
            type="text"
            value={formData.instagram_handle || ''}
            onChange={(e) => handleChange('instagram_handle', e.currentTarget.value)}
            placeholder="handle"
            disabled={isLoading}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
          />
        </div>
      </div>

      {/* Contact Email */}
      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">
          İletişim E-postası
        </label>
        <input
          type="email"
          value={formData.contact_email || ''}
          onChange={(e) => handleChange('contact_email', e.currentTarget.value)}
          placeholder="contact@example.com"
          disabled={isLoading}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
        />
        <p className="mt-1 text-xs text-slate-500">Topluluk üyeleri sizi bu e-posta ile iletişime geçebilirler</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Topluluk profili başarıyla güncellendi!
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
