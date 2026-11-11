/* ベンダー会員のフォームの状態型と初期値（"use server" ファイルから定数を export すると実行時に落ちるので、ここに置く）。 */

export const SITE = "https://vizlabo.com";

export type AuthState = {
  step: "email" | "code";
  email?: string;
  error?: string;
};

export const initialAuthState: AuthState = { step: "email" };

export type ApplyState = { status: "idle" | "ok" | "error"; error?: string };

export const initialApplyState: ApplyState = { status: "idle" };

export type TeamInviteState = { url?: string; code?: string; error?: string };

export const initialTeamInviteState: TeamInviteState = {};

export function inviteUrl(code: string): string {
  return `${SITE}/vendor/join?code=${encodeURIComponent(code)}`;
}
