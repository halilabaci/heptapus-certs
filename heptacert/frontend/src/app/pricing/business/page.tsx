import type { Metadata } from "next";
import PricingClient from "../_pricing-client";

export const metadata: Metadata = {
  title: "Kurumsal Fiyatlandırma",
  description: "Kurumsal kullanıcılar ve organizasyonlar için fiyatlandırma planları.",
};

export default function BusinessPricingPage() {
  return <PricingClient mode="business" />;
}
