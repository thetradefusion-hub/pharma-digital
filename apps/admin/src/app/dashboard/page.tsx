"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FolderTree, ImageOff, Package, Plus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-brand">{value}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.getDashboardStats(),
  });
  const charts = useQuery({
    queryKey: ["dashboard-charts"],
    queryFn: () => api.getDashboardCharts(),
  });

  if (stats.isLoading || charts.isLoading) {
    return <div className="text-sm text-slate-500">Loading dashboard…</div>;
  }

  if (stats.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load dashboard. Ensure the API is running and you are signed
        in as admin.
      </div>
    );
  }

  const needingImages = charts.data?.productsNeedingImages ?? [];
  const recent = charts.data?.recentlyUpdatedProducts ?? [];
  const missingCount = stats.data?.productsWithoutImages ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
            Overview
          </h1>
          <p className="text-sm text-slate-500">
            Pharma Digital catalogue counts and shortcuts for MR presentations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/products/new">
              <Plus className="h-4 w-4" />
              Add product
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/products">
              <Package className="h-4 w-4" />
              Products
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/categories">
              <FolderTree className="h-4 w-4" />
              Categories
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/users">
              <Users className="h-4 w-4" />
              Mobile users
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Published"
          value={stats.data?.activeProducts ?? 0}
          hint={`${stats.data?.totalProducts ?? 0} total products`}
        />
        <StatCard label="Draft" value={stats.data?.draftProducts ?? 0} />
        <StatCard
          label="Categories"
          value={stats.data?.totalCategories ?? 0}
        />
        <StatCard
          label="Subcategories"
          value={stats.data?.totalSubCategories ?? 0}
        />
        <StatCard
          label="Mobile users"
          value={stats.data?.totalMobileUsers ?? 0}
        />
      </div>

      {missingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-amber-900">
              <ImageOff className="h-4 w-4" />
              {missingCount} product{missingCount === 1 ? "" : "s"} without
              slide images
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-amber-800/80">
              Mobile slider ke liye images add karein.
            </p>
            {needingImages.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 border-b border-amber-200/70 py-2 text-sm last:border-0"
              >
                <div>
                  <p className="font-medium text-slate-900">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.brandName}</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/products/${product.id}`}>Add images</Link>
                </Button>
              </div>
            ))}
            {missingCount > needingImages.length && (
              <Button asChild variant="outline" size="sm">
                <Link href="/products">View all products</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recently updated</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">No products yet.</p>
          ) : (
            <div className="divide-y divide-surface-border">
              {recent.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">
                      {product.brandName} · {product.imageCount} slide
                      {product.imageCount === 1 ? "" : "s"} ·{" "}
                      {formatDate(product.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={product.status} />
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/products/${product.id}`}>Edit</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
