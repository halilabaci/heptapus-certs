import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Community Pricing - HeptaCert",
  description:
    "Join our community with flexible tiers. Free access to discover events, or upgrade to Pro for unlimited posting and connections.",
  openGraph: {
    title: "Community Pricing | HeptaCert",
    description:
      "Join our community with flexible tiers. Free access to discover events, or upgrade to Pro for unlimited posting and connections.",
    type: "website",
  },
};

export default function CommunityPricingPage() {
  redirect("/pricing/member");
}
