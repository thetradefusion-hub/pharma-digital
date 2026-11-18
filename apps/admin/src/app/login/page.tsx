"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@pharma/validation";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { useToast } from "@/components/ui/toast";
import {
  BRAND_ADMIN_LABEL,
  BRAND_LOGO_SRC,
  BRAND_NAME,
  BRAND_TAGLINE,
} from "@/lib/brand";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { emailOrUsername: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values.emailOrUsername, values.password);
      toast("Signed in successfully");
      router.replace("/dashboard");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Login failed", "error");
    }
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,#dbe7f5,transparent_42%),radial-gradient(circle_at_bottom_right,#d8f3ef,transparent_36%),#F4F7FB] px-4 py-10">
      <Card className="w-full max-w-md border-surface-border shadow-soft">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <Image
              src={BRAND_LOGO_SRC}
              alt={BRAND_NAME}
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl object-cover"
              priority
              unoptimized
            />
            <div>
              <p className="text-lg font-extrabold tracking-tight text-brand">
                {BRAND_NAME}
              </p>
              <p className="text-xs font-medium text-slate-500">{BRAND_TAGLINE}</p>
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
              {BRAND_ADMIN_LABEL} Sign In
            </CardTitle>
            <CardDescription className="mt-1.5">
              Manage products, categories, and slide images for mobile
              presentations.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="emailOrUsername">Email or username</Label>
              <Input
                id="emailOrUsername"
                placeholder="admin@pharma.demo"
                {...form.register("emailOrUsername")}
              />
              {form.formState.errors.emailOrUsername && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.emailOrUsername.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
