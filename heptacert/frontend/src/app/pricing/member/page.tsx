import type { Metadata } from "next";
import PricingClient from "../_pricing-client";

export const metadata: Metadata = {
  title: "Üyelik Fiyatlandırma",
  description: "Normal kullanıcılar için üyelik ve profile odaklı fiyatlandırma planları.",
};

export default function MemberPricingPage() {
  return <PricingClient mode="member" />;
}
