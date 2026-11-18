"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Catalogue Management removed from admin — redirect to products. */
export default function CatalogueRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/products");
  }, [router]);
  return <p className="text-sm text-slate-500">Redirecting to Products…</p>;
}
