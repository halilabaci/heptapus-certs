"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import OrgSocialProfileForm, {
  type OrgSocialProfileData,
} from "@/components/OrgSocialProfile/OrgSocialProfileForm";

interface OrgData {
  id: number;
  public_id: string;
  name: string;
  bio?: string;
  banner_url?: string;
  website?: string;
  github_url?: string;
  instagram_handle?: string;
  contact_email?: string;
}

export default function OrgSocialProfileAdminPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load organization data
  useEffect(() => {
    const loadOrgData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to fetch the authenticated user's organization
        // This requires the backend to provide an endpoint
        // For now, we mock the data - this will be replaced with actual API call
        const response = await fetch("/api/organizations/me");
        if (!response.ok) {
          throw new Error("Topluluk verisi yüklenemedi");
        }

        const data = await response.json();
        setOrg(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    loadOrgData();
  }, []);

  const handleSubmit = async (data: OrgSocialProfileData) => {
    if (!org) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/organizations/${org.public_id}/social-profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Kaydedilemedi");
      }

      const updatedOrg = await response.json();
      setOrg(updatedOrg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-600 mb-4" />
          <p className="text-slate-600">Topluluk verisi yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 mb-6">
            <p className="text-red-700 font-semibold mb-4">
              {error || "Topluluk bulunamadı"}
            </p>
            <Link href="/admin" className="text-blue-600 hover:underline text-sm font-semibold">
              Yönetim Paneline Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href="/admin" className="text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{org.name}</h1>
          <p className="mt-1 text-sm text-slate-600">Topluluk sosyal profili yönetimi</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 mb-8 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-600 mb-1">Topluluk ID</p>
          <p className="font-mono text-sm text-slate-900">{org.public_id}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-600 mb-1">Profil Durumu</p>
          <p className="text-sm text-slate-900">{org.bio ? "Tamamlanmış" : "Eksik"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-600 mb-1">Website</p>
          <p className="text-sm text-slate-900">{org.website ? "Bağlı" : "Bağlı değil"}</p>
        </div>
      </div>

      {/* Form */}
      <div>
        <h2 className="mb-6 text-xl font-bold text-slate-900">Sosyal Profil Düzenle</h2>
        <OrgSocialProfileForm
          initialData={{
            bio: org.bio || "",
            banner_url: org.banner_url,
            website: org.website,
            github_url: org.github_url,
            instagram_handle: org.instagram_handle,
            contact_email: org.contact_email,
          }}
          orgName={org.name}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
        />
      </div>

      {/* Help Text */}
      <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 İpucu</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Banner resmi, topluluğunuzun kimliğini yansıtan çekici bir görüntü olmalı</li>
          <li>• Açıklamada topluluğunuzun amacı, neler yaptığınız ve kimleri beklediğinizi belirtin</li>
          <li>• Sosyal ağ linklerinizi ekleyerek topluluğunuzu daha erişilebilir hale getirin</li>
          <li>• İletişim e-postası, üyeleriniz tarafından görülebilecektir</li>
        </ul>
      </div>
    </div>
  );
}
