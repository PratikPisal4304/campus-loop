"use client";

import { useState } from "react";
import { Input } from "@/components/ui/field";
import { cn } from "@/shared/ui/cn";

/**
 * Password box with a real show/hide toggle. The prototype's toggle was a glyph with an
 * onclick and no label or state, so a screen reader heard nothing but "button".
 */
export function PasswordInput({ className, ...props }: React.ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="text-fg-muted hover:text-accent absolute top-0 right-0 flex h-11 w-11 items-center justify-center rounded-sm text-[13px] transition-colors duration-200"
      >
        <span aria-hidden="true">{visible ? "◉" : "◎"}</span>
      </button>
    </div>
  );
}
