import { Download, Lock, PartyPopper, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SiteData } from "@/lib/site.functions";

type Props = {
  apk: SiteData["apk"];
  unlocked: boolean;
  joinedCount: number;
  requiredCount: number;
  pending: boolean;
  onDownload: () => void;
};

export function DownloadPanel({
  apk,
  unlocked,
  joinedCount,
  requiredCount,
  pending,
  onDownload,
}: Props) {
  const percent = requiredCount === 0 ? 0 : Math.round((joinedCount / requiredCount) * 100);

  return (
    <section
      id="download"
      className={cn(
        "animate-rise relative overflow-hidden rounded-3xl p-5 sm:p-7",
        unlocked ? "glass-accent" : "glass",
      )}
    >
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
        <ShieldCheck className="size-4" /> Verified by server
      </div>

      <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
        {unlocked ? "Your APK Is Ready" : "Your APK Is Ready"}
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {unlocked
          ? "All channels joined successfully. Your download is unlocked!"
          : "Join all required channels above to unlock your download."}
      </p>

      <div className="mt-5">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <span>Channel verification</span>
          <span className={unlocked ? "text-success" : "text-primary"}>{percent}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700 ease-out",
              unlocked ? "bg-success" : "bg-primary",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {joinedCount} of {requiredCount} required channels verified
          {unlocked ? " — Verification complete" : ""}
        </p>
      </div>

      {unlocked && (
        <p className="animate-pop mt-4 flex items-center gap-2 rounded-xl bg-success/12 px-3 py-2.5 text-sm font-semibold text-success">
          <PartyPopper className="size-4" /> All channels verified! Download unlocked.
        </p>
      )}

      <Button
        size="lg"
        disabled={!unlocked || pending || !apk.enabled}
        onClick={onDownload}
        className={cn(
          "mt-5 h-14 w-full rounded-2xl text-sm font-extrabold uppercase tracking-[0.16em] transition-all active:scale-[0.98]",
          unlocked && "shadow-glow",
        )}
      >
        {unlocked ? <Download className="size-5" /> : <Lock className="size-5" />}
        {!apk.enabled
          ? "Download disabled"
          : unlocked
            ? pending
              ? "Preparing..."
              : apk.button_text
            : "Join channels to download"}
      </Button>

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        The download link is stored on the server and released only after verification.
      </p>
    </section>
  );
}
