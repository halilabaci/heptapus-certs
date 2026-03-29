"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./api";

export interface SubscriptionInfo {
  active: boolean;
  plan_id: string | null;
  expires_at?: string | null;
}

export function useSubscription() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    apiFetch("/billing/subscription")
      .then(r => r.json())
      .then((s: SubscriptionInfo) => { if (!mounted) return; setSubscription(s); })
      .catch((e) => { if (!mounted) return; setError(e?.message || "Failed to load subscription"); })
      .finally(() => { if (!mounted) return; setLoading(false); });
    return () => { mounted = false; };
  }, []);

  function hasPlan(allowed: string[] = []) {
    if (!subscription || !subscription.plan_id) return false;
    return allowed.includes(subscription.plan_id);
  }

  return { loading, subscription, error, hasPlan } as const;
}

export function FeatureGate({ requiredPlans = ["growth", "enterprise"], children, message }:
  { requiredPlans?: string[]; children: React.ReactNode; message?: React.ReactNode }) {
  const { loading, subscription, hasPlan } = useSubscription();

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;
  if (!hasPlan(requiredPlans)) {
    return (
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-8 text-center">
        <h3 className="text-lg font-semibold">Pro veya Enterprise Plan Gerekiyor</h3>
        <p className="text-sm text-gray-600 mt-2">{message || "Bu özelliğe erişmek için hesabınızın Growth veya Enterprise planında olması gerekir."}</p>
        <div className="mt-4">
          <a href="/pricing" className="btn-primary">Planı Yükselt</a>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
