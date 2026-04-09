"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function MembersRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    if (memberId) {
      router.replace(`/member/${memberId}`);
    }
  }, [memberId, router]);

  return null;
}
