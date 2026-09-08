"use client";

import { usePathname } from "next/navigation";
import { DisplayHeading, Eyebrow } from "@/components/brand/typography";

interface PanelCopy {
  readonly eyebrow: string;
  readonly headline: readonly [string, string];
  readonly body: string;
  readonly features: readonly { glyph: string; title: string; detail: string }[];
}

const LOGIN: PanelCopy = {
  eyebrow: "A campus full of possibilities",
  headline: ["Welcome", "back."],
  body: "Your campus is always in circulation. Buy, rent, sell and exchange with students around you.",
  features: [
    { glyph: "↗", title: "Buy & Sell", detail: "Useful things at student-friendly prices." },
    {
      glyph: "♻",
      title: "Keep it circulating",
      detail: "Give your unused items a second life.",
    },
    { glyph: "◉", title: "Campus community", detail: "Connect with students around you." },
  ],
};

const SIGNUP: PanelCopy = {
  eyebrow: "Your next semester starts here",
  headline: ["Your campus.", "In circulation."],
  body: "Create your account and start buying, renting, selling and exchanging useful things with students around campus.",
  features: [
    {
      glyph: "↗",
      title: "Sell what you don't need",
      detail: "Turn unused stuff into extra money.",
    },
    {
      glyph: "↻",
      title: "Rent instead of buying",
      detail: "Save money on things you need temporarily.",
    },
    { glyph: "♻", title: "Keep things moving", detail: "Help another student make use of it." },
  ],
};

/**
 * The panel copy is route-specific but the shell around it (logo, copyright, decoration)
 * is shared, so the layout owns the frame and this reads the route to pick the words.
 * It is the one client boundary here — the panel is decorative and hidden under 1024px.
 */
export function WelcomePanel() {
  const pathname = usePathname();
  const copy = pathname.startsWith("/signup") ? SIGNUP : LOGIN;

  return (
    <div className="relative my-auto max-w-md">
      <Eyebrow tone="orange">{copy.eyebrow}</Eyebrow>

      <DisplayHeading as="h2" size="page" className="mt-4">
        {copy.headline[0]}
        <br />
        <span className="text-accent">{copy.headline[1]}</span>
      </DisplayHeading>

      <p className="text-fg-muted mt-6 text-[14px] leading-[1.8]">{copy.body}</p>

      <ul className="mt-10 flex flex-col gap-5">
        {copy.features.map((feature) => (
          <li key={feature.title} className="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className="border-border bg-surface flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-[14px]"
            >
              {feature.glyph}
            </span>
            <span className="flex flex-col gap-0.5">
              <strong className="text-fg text-[13px] font-semibold">{feature.title}</strong>
              <small className="text-fg-muted text-[12px] leading-[1.6]">
                {feature.detail}
              </small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
