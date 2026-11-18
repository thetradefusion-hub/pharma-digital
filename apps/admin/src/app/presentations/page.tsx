"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Presentation slides admin removed — products own the image slider. */
export default function PresentationsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/products");
  }, [router]);
  return (
    <p className="text-sm text-slate-500">
      Redirecting to Products…
    </p>
  );
}
