import type { Metadata } from "next";
import { Suspense } from "react";
import RegisterHub from "./_register-hub";

export const metadata: Metadata = {
  title: "Hesap Olustur",
  description: "HeptaCert'e ucretsiz kaydolun. 100 HC hediye bakiyesiyle dijital sertifika olusturmaya hemen baslayin.",
  openGraph: {
    title: "Hesap Olustur | HeptaCert",
    description: "HeptaCert'e ucretsiz kaydolun. 100 HC hediye bakiyesiyle dijital sertifika olusturmaya hemen baslayin.",
    type: "website",
  },
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center" />}>
      <RegisterHub />
    </Suspense>
  );
}