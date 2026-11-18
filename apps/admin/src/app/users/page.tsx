"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userCreateSchema, type UserCreateInput } from "@pharma/validation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

export default function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resetPasswordFor, setResetPasswordFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const users = useQuery({
    queryKey: ["users"],
    queryFn: async () =>
      (await api.listUsers("?limit=100&role=MOBILE_USER")).data,
  });

  const form = useForm<UserCreateInput>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      email: "",
      username: "",
      fullName: "",
      password: "",
      role: "MOBILE_USER",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: UserCreateInput) => api.createUser(values),
    onSuccess: async () => {
      toast("Mobile user created");
      form.reset({
        email: "",
        username: "",
        fullName: "",
        password: "",
        role: "MOBILE_USER",
        isActive: true,
      });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.setUserStatus(id, isActive),
    onSuccess: async () => {
      toast("User status updated");
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.resetUserPassword(id, password),
    onSuccess: async () => {
      toast("Password reset");
      setResetPasswordFor(null);
      setNewPassword("");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Create mobile user</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
          >
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input {...form.register("fullName")} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...form.register("email")} />
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input {...form.register("username")} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" {...form.register("password")} />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              Create user
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mobile users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-surface-border text-slate-500">
                <tr>
                  <th className="py-2 font-medium">User</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Last login</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(users.data ?? []).map((user) => (
                  <tr key={user.id} className="border-b border-surface-border">
                    <td className="py-3">
                      <p className="font-medium">{user.fullName}</p>
                      <p className="text-xs text-slate-500">
                        {user.email} · @{user.username}
                      </p>
                    </td>
                    <td className="py-3">{user.isActive ? "Active" : "Inactive"}</td>
                    <td className="py-3">{formatDate(user.lastLoginAt)}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            statusMutation.mutate({
                              id: user.id,
                              isActive: !user.isActive,
                            })
                          }
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setResetPasswordFor(user.id)}
                        >
                          Reset password
                        </Button>
                      </div>
                      {resetPasswordFor === user.id && (
                        <div className="mt-2 flex gap-2">
                          <Input
                            type="password"
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <Button
                            size="sm"
                            onClick={() =>
                              resetMutation.mutate({
                                id: user.id,
                                password: newPassword,
                              })
                            }
                          >
                            Save
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!users.data?.length && (
              <p className="py-8 text-center text-sm text-slate-500">
                No mobile users yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
