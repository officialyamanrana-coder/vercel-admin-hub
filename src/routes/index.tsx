import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck, Sparkles, Package, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

import fallbackLogo from "@/assets/logo.png";
import { ChannelCard, type ChannelStatus } from "@/components/site/ChannelCard";
import { DownloadPanel } from "@/components/site/DownloadPanel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getSiteData,
  openChannel,
  requestDownload,
  trackVisit,
  verifyChannel,
} from "@/lib/site.functions";

const siteQuery = queryOptions({
  queryKey: ["site-data"],
  queryFn: () => getSiteData(),
  staleTime: 15_000,
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  head: () => ({
    meta: [
      { title: "APK WORLD — Download Premium APKs Safely & Easily" },
      {
        name: "description",
        content:
          "Join our official Telegram channels and unlock verified, ad-free premium APK downloads. Fast, safe and mobile-first.",
      },
      { property: "og:title", content: "APK WORLD — Premium APK Downloads" },
      {
        property: "og:description",
        content: "Verified premium APK downloads unlocked after Telegram channel verification.",
      },
    ],
  }),
  pendingComponent: HomeSkeleton,
  component: HomePage,
});

type TelegramWebApp = { initData?: string; ready?: () => void; expand?: () => void };

function HomePage() {
  const { data } = useSuspenseQuery(siteQuery);
  const queryClient = useQueryClient();

  const visit = useServerFn(trackVisit);
  const open = useServerFn(openChannel);
  const verify = useServerFn(verifyChannel);
  const download = useServerFn(requestDownload);

  const [statuses, setStatuses] = useState<Record<string, ChannelStatus>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    void visit({});
  }, [visit]);

  useEffect(() => {
    const app = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
    app?.ready?.();
    app?.expand?.();
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  const channels = data?.channels ?? [];
  const requiredChannels = useMemo(() => channels.filter((c) => c.required), [channels]);
  const joinedRequired = requiredChannels.filter(
    (channel) => channel.joined || statuses[channel.id] === "joined",
  ).length;

  const statusFor = (id: string, joined: boolean): ChannelStatus =>
    joined ? "joined" : (statuses[id] ?? "idle");

  const runVerify = useCallback(
    async (channelId: string, silent = false) => {
      setStatuses((prev) => ({ ...prev, [channelId]: "checking" }));
      setMessages((prev) => ({ ...prev, [channelId]: "Checking membership..." }));
      try {
        const initData =
          (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp
            ?.initData ?? undefined;
        const result = await verify({ data: { channelId, initData } });
        if (result.status === "joined") {
          setStatuses((prev) => ({ ...prev, [channelId]: "joined" }));
          setMessages((prev) => ({ ...prev, [channelId]: "Joined & verified" }));
          toast.success("Channel verified");
          await queryClient.invalidateQueries({ queryKey: siteQuery.queryKey });
          return;
        }
        if (result.status === "too_soon") {
          setStatuses((prev) => ({ ...prev, [channelId]: "checking" }));
          setMessages((prev) => ({
            ...prev,
            [channelId]: `Checking... ${result.secondsLeft}s left`,
          }));
          timers.current[channelId] = setTimeout(
            () => void runVerify(channelId, true),
            result.secondsLeft * 1000 + 400,
          );
          return;
        }
        setStatuses((prev) => ({ ...prev, [channelId]: "failed" }));
        setMessages((prev) => ({ ...prev, [channelId]: result.message }));
        if (!silent) toast.error(result.message);
      } catch (error) {
        setStatuses((prev) => ({ ...prev, [channelId]: "failed" }));
        setMessages((prev) => ({ ...prev, [channelId]: "Verification failed. Try again." }));
        console.error(error);
      }
    },
    [queryClient, verify],
  );

  const handleJoin = useCallback(
    async (channelId: string) => {
      try {
        const { url } = await open({ data: { channelId } });
        window.open(url, "_blank", "noopener,noreferrer");
        setStatuses((prev) => ({ ...prev, [channelId]: "checking" }));
        setMessages((prev) => ({ ...prev, [channelId]: "Checking membership..." }));
        timers.current[channelId] = setTimeout(() => void runVerify(channelId, true), 7000);
      } catch (error) {
        console.error(error);
        toast.error("Could not open this channel.");
      }
    },
    [open, runVerify],
  );

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const result = await download({});
      toast.success("Download started");
      window.location.href = result.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download unavailable");
    } finally {
      setDownloading(false);
    }
  }, [download]);

  const unlocked = requiredChannels.length > 0 && joinedRequired === requiredChannels.length;
  const logo = data.settings.logo_url || fallbackLogo;

  return (
    <div className="page-glow min-h-screen pb-28 sm:pb-16">
      <header className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pt-9 text-center sm:pt-14">
        <div className="animate-pop relative">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-primary/25 blur-2xl" />
          <img
            src={logo}
            alt={`${data.settings.site_name} logo`}
            width={112}
            height={112}
            className="size-24 rounded-3xl object-contain sm:size-28"
          />
        </div>
        <h1 className="text-gradient-brand mt-4 text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
          {data.settings.site_name}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground sm:text-base">
          {data.settings.tagline}
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <ShieldCheck className="size-3.5 text-success" /> Server-verified downloads
        </div>
      </header>

      <main className="mx-auto mt-8 flex w-full max-w-2xl flex-col gap-6 px-4">
        <section className="glass animate-rise rounded-3xl p-5">
          <div className="flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Package className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">{data.apk.name}</h2>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="rounded-full bg-muted px-2.5 py-1">v{data.apk.version}</span>
                {data.apk.size_label && (
                  <span className="rounded-full bg-muted px-2.5 py-1">{data.apk.size_label}</span>
                )}
                <span className="rounded-full bg-success/15 px-2.5 py-1 text-success">
                  Virus free
                </span>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {data.apk.description}
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.2em]">
              <Sparkles className="size-4 text-primary" /> Join our channels
            </h2>
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {joinedRequired}/{requiredChannels.length}
            </span>
          </div>

          {channels.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
              No channels configured yet. Add them from the admin panel.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {channels.map((channel, index) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  index={index}
                  status={statusFor(channel.id, channel.joined)}
                  message={channel.joined ? undefined : messages[channel.id]}
                  onJoin={() => void handleJoin(channel.id)}
                  onVerify={() => void runVerify(channel.id)}
                />
              ))}
            </div>
          )}
        </section>

        <DownloadPanel
          apk={data.apk}
          unlocked={unlocked}
          joinedCount={joinedRequired}
          requiredCount={requiredChannels.length}
          pending={downloading}
          onDownload={() => void handleDownload()}
        />

        <footer className="mb-6 mt-2 flex flex-col items-center gap-2 text-center text-[11px] text-muted-foreground">
          <p>{data.settings.footer_text}</p>
        </footer>

      </main>

      {/* Sticky mobile status bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 px-4 py-3 backdrop-blur-xl sm:hidden">
        <a
          href="#download"
          className={`flex h-12 items-center justify-center gap-2 rounded-xl text-xs font-extrabold uppercase tracking-[0.16em] transition-colors ${
            unlocked
              ? "bg-primary text-primary-foreground shadow-glow"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {unlocked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
          {unlocked ? "Download unlocked" : `Locked · ${joinedRequired}/${requiredChannels.length}`}
        </a>
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="page-glow min-h-screen px-4 py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4">
        <Skeleton className="size-24 rounded-3xl" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="mt-4 h-28 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    </div>
  );
}
