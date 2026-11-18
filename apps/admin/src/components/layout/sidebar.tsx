"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BRAND_ADMIN_LABEL,
  BRAND_LOGO_SRC,
  BRAND_NAME,
  BRAND_TAGLINE,
} from "@/lib/brand";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories & Subcategories", icon: FolderTree },
  { href: "/users", label: "Mobile Users", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-surface-border bg-white transition-all",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between gap-2 border-b border-surface-border px-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image
            src={BRAND_LOGO_SRC}
            alt={BRAND_NAME}
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-lg object-cover"
            priority
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-tight text-brand">
                {BRAND_NAME}
              </p>
              <p className="truncate text-[11px] font-medium text-slate-500">
                {BRAND_ADMIN_LABEL}
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
      {collapsed && (
        <div className="flex justify-center border-b border-surface-border py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!collapsed && (
        <div className="border-b border-surface-border px-4 py-2.5">
          <p className="text-[11px] font-medium leading-snug text-slate-500">
            {BRAND_TAGLINE}
          </p>
        </div>
      )}

      <nav className="flex-1 space-y-1 p-2">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand text-white shadow-soft"
                  : "text-slate-600 hover:bg-brand-50 hover:text-brand",
              )}
              title={item.label}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-surface-border px-4 py-3">
          <p className="text-[11px] font-semibold text-brand">{BRAND_NAME}</p>
          <p className="text-[10px] text-slate-500">Mobile presentation CMS</p>
        </div>
      )}
    </aside>
  );
}
