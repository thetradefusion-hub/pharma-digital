"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Application</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            <strong>Product:</strong> Pharma Digital — Product Catalogue & Visual Aid
          </p>
          <p>
            <strong>Admin:</strong> Pharma Digital Admin CMS
          </p>
          <p>
            <strong>Admin API:</strong>{" "}
            {process.env.NEXT_PUBLIC_API_URL ?? "/api (same-origin)"}
          </p>
          <p>
            <strong>Theme:</strong> Light · Deep Blue (#0B3A6E) · Teal accent
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Security notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>Access tokens are short-lived; refresh tokens rotate on use.</p>
          <p>
            Deactivating a mobile user revokes refresh tokens immediately for online
            devices. Fully offline devices cannot receive immediate remote revocation.
          </p>
          <p>
            Medical content must be client-approved. Demo seed data is clearly marked
            as sample content.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
