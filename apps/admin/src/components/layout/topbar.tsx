"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { useAuthStore } from "@/store/auth-store";

export function Topbar({ title }: { title: string }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="flex h-16 items-center justify-between border-b border-surface-border bg-white px-6">
      <div>
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="text-xs font-medium text-slate-500">
          {BRAND_NAME} · {BRAND_TAGLINE}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-800">{user?.fullName}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await logout();
            window.location.href = "/login";
          }}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
