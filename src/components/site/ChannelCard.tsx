import { CheckCircle2, ExternalLink, Loader2, Send, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicChannel } from "@/lib/site.functions";

export type ChannelStatus = "idle" | "opened" | "checking" | "joined" | "failed";

type Props = {
  channel: PublicChannel;
  index: number;
  status: ChannelStatus;
  message?: string;
  onJoin: () => void;
  onVerify: () => void;
};

const statusLabel: Record<ChannelStatus, string> = {
  idle: "Not joined",
  opened: "Waiting for you",
  checking: "Checking membership...",
  joined: "Joined & verified",
  failed: "Not joined",
};

export function ChannelCard({ channel, index, status, message, onJoin, onVerify }: Props) {
  const joined = status === "joined";
  const checking = status === "checking";

  return (
    <article
      className={cn(
        "animate-rise group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 sm:p-5",
        joined ? "glass-accent" : "glass hover:border-primary/40",
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
            joined ? "bg-success/15 text-success" : "bg-primary/15 text-primary",
          )}
        >
          {joined ? <CheckCircle2 className="size-6" /> : <Send className="size-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-bold uppercase tracking-wide sm:text-base">
              {channel.name}
            </h3>
            {!channel.required && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                optional
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
            {channel.description || "Official Telegram channel"}
          </p>
          <p className="mt-1 truncate text-[11px] font-medium tracking-wide text-primary/80">
            {channel.username}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {joined ? (
          <span className="animate-pop inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-success">
            <CheckCircle2 className="size-3.5" /> {statusLabel.joined}
          </span>
        ) : (
          <>
            <Button
              size="lg"
              onClick={onJoin}
              className="h-11 flex-1 rounded-xl text-xs font-bold uppercase tracking-widest active:scale-[0.98] sm:flex-none"
            >
              <ExternalLink className="size-4" /> Join channel
            </Button>
            <Button
              size="lg"
              variant="secondary"
              disabled={checking}
              onClick={onVerify}
              className="h-11 rounded-xl text-xs font-bold uppercase tracking-widest active:scale-[0.98]"
            >
              {checking ? <Loader2 className="size-4 animate-spin" /> : null}
              {checking ? "Checking" : "Verify"}
            </Button>
          </>
        )}
      </div>

      <p
        className={cn(
          "mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider",
          joined && "text-success",
          checking && "text-warning",
          !joined && !checking && "text-muted-foreground",
        )}
      >
        {status === "failed" && <ShieldAlert className="size-3.5 text-destructive" />}
        {message ?? statusLabel[status]}
      </p>
    </article>
  );
}
