"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Old slide editor URLs redirect into the product image slider. */
export default function PresentationEditorRedirectPage() {
  const params = useParams<{ productId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/products/${params.productId}`);
  }, [params.productId, router]);

  return (
    <p className="text-sm text-slate-500">
      Redirecting to product images…
    </p>
  );
}
