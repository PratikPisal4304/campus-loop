"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ActionForm, type FormFeedback } from "@/components/ui/action-form";
function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
function snapshot() {
  return new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
}
/** Fragments stay in the browser, keeping reset secrets out of HTTP request URL logs. */
export function ResetForm({ action }: { action: (data: FormData) => Promise<FormFeedback> }) {
  const token = useSyncExternalStore(subscribe, snapshot, () => null);
  if (token === null) return <p className="text-fg-muted">Checking reset link…</p>;
  if (!/^[a-f0-9]{64}$/.test(token))
    return (
      <p className="text-danger">
        This link is invalid.{" "}
        <Link href="/forgot-password" className="underline">
          Request another link.
        </Link>
      </p>
    );
  return (
    <ActionForm action={action} label="Change password">
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm">
        New password
        <input
          className="form-input mt-2"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
        />
      </label>
      <label className="block text-sm">
        Confirm password
        <input
          className="form-input mt-2"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
        />
      </label>
    </ActionForm>
  );
}
