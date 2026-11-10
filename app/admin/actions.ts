"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminToken, checkPassword } from "../../lib/admin";
import { allow } from "../../lib/ratelimit";

export async function login(fd: FormData): Promise<void> {
  const next = String(fd.get("next") ?? "/admin/views");
  const dest = next.startsWith("/admin/") ? next : "/admin/views";
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allow(`admin:ip:${ip}`, 10, 60 * 60 * 1000) || !checkPassword(String(fd.get("password") ?? ""))) {
    redirect(`${dest}${dest.includes("?") ? "&" : "?"}error=1`);
  }
  (await cookies()).set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 180,
  });
  redirect(dest);
}

export async function logout(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/");
}
