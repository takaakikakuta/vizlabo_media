"use client";

import { useActionState } from "react";
import { inviteTeammate } from "../../app/vendor/actions";
import { initialTeamInviteState } from "../../lib/vendorAuth";

/* 管理者（最初に登録した人）が同僚を招待する。発行した URL を自分で同僚に送ってもらう */
export default function TeamInvite() {
  const [state, action, pending] = useActionState(inviteTeammate, initialTeamInviteState);
  return (
    <form action={action} className="space-y-2">
      <button disabled={pending} className="border border-line px-3 py-1.5 text-[12.5px] text-ink hover:border-ink disabled:opacity-40">
        {pending ? "発行中 …" : "同僚を招待するURLを発行"}
      </button>
      {state.error && <p className="text-[12px] text-red-700">{state.error}</p>}
      {state.url && (
        <div className="border border-line bg-soft px-3 py-2 text-[12.5px] leading-relaxed text-body">
          <p>このURLを同僚の方に送ってください（60日間有効）。</p>
          <p className="mt-1 break-all font-bold text-ink">{state.url}</p>
          <p className="mt-1 text-muted">招待コード: {state.code}</p>
        </div>
      )}
    </form>
  );
}
