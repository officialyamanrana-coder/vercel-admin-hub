import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PublicChannel = {
  id: string;
  name: string;
  description: string;
  username: string;
  url: string;
  required: boolean;
  joined: boolean;
  opened: boolean;
};

export type SiteData = {
  settings: {
    site_name: string;
    tagline: string;
    logo_url: string | null;
    favicon_url: string | null;
    footer_text: string;
  };
  apk: {
    name: string;
    version: string;
    size_label: string;
    description: string;
    button_text: string;
    enabled: boolean;
  };
  channels: PublicChannel[];
  unlocked: boolean;
};

export const getSiteData = createServerFn({ method: "GET" }).handler(async (): Promise<SiteData> => {
  const fallback: SiteData = {
    settings: {
      site_name: "APK WORLD",
      tagline: "Download Premium APKs Safely & Easily",
      logo_url: null,
      favicon_url: null,
      footer_text: "© APK WORLD. All rights reserved.",
    },
    apk: {
      name: "Premium APK",
      version: "1.0.0",
      size_label: "",
      description: "The download will be available again shortly.",
      button_text: "DOWNLOAD APK",
      enabled: false,
    },
    channels: [],
    unlocked: false,
  };

  try {
    const { supabaseAdmin, getVisitorSession } = await import("./gate.server");
    const session = await getVisitorSession();

    const [settingsResult, apkResult, channelsResult] = await Promise.all([
      supabaseAdmin.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      supabaseAdmin.from("apk_config").select("*").eq("id", 1).maybeSingle(),
      supabaseAdmin
        .from("channels")
        .select("*")
        .eq("enabled", true)
        .order("position", { ascending: true }),
    ]);

    const backendError = settingsResult.error ?? apkResult.error ?? channelsResult.error;
    if (backendError) throw backendError;

    const joined = session.data.joined ?? {};
    const opened = session.data.opened ?? {};

    const channels: PublicChannel[] = (channelsResult.data ?? []).map((channel) => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      username: channel.username,
      url: channel.url,
      required: channel.required,
      joined: Boolean(joined[channel.id]),
      opened: Boolean(opened[channel.id]),
    }));

    const required = channels.filter((channel) => channel.required);
    const unlocked = required.length > 0 && required.every((channel) => channel.joined);

    return {
      settings: {
        site_name: settingsResult.data?.site_name ?? fallback.settings.site_name,
        tagline: settingsResult.data?.tagline ?? fallback.settings.tagline,
        logo_url: settingsResult.data?.logo_url ?? null,
        favicon_url: settingsResult.data?.favicon_url ?? null,
        footer_text: settingsResult.data?.footer_text ?? fallback.settings.footer_text,
      },
      apk: {
        name: apkResult.data?.name ?? fallback.apk.name,
        version: apkResult.data?.version ?? fallback.apk.version,
        size_label: apkResult.data?.size_label ?? "",
        description: apkResult.data?.description ?? "",
        button_text: apkResult.data?.button_text ?? fallback.apk.button_text,
        enabled: apkResult.data?.enabled ?? false,
      },
      channels,
      unlocked,
    };
  } catch (error) {
    console.error("[site-data] backend unavailable", error);
    return fallback;
  }
});

export const trackVisit = createServerFn({ method: "POST" }).handler(async () => {
  const { getVisitorSession, track } = await import("./gate.server");
  const session = await getVisitorSession();
  if (session.data.visited) return { ok: true as const };
  await session.update({ visited: true });
  await track("visit");
  return { ok: true as const };
});

/** Records that the visitor opened a channel and returns the canonical link. */
export const openChannel = createServerFn({ method: "POST" })
  .inputValidator((data: { channelId: string }) => z.object({ channelId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin, getVisitorSession, track } = await import("./gate.server");
    const { data: channel } = await supabaseAdmin
      .from("channels")
      .select("id, url, enabled")
      .eq("id", data.channelId)
      .maybeSingle();
    if (!channel || !channel.enabled) throw new Error("Channel not found");

    const session = await getVisitorSession();
    await session.update({
      opened: { ...(session.data.opened ?? {}), [channel.id]: Date.now() },
    });
    await track("channel_open", channel.id);
    return { url: channel.url };
  });

export type VerifyResult =
  | { status: "joined" }
  | { status: "not_joined"; message: string }
  | { status: "too_soon"; secondsLeft: number };

export const verifyChannel = createServerFn({ method: "POST" })
  .inputValidator((data: { channelId: string; initData?: string | undefined }) =>
    z.object({ channelId: z.string().uuid(), initData: z.string().max(4096).optional() }).parse(data),
  )
  .handler(async ({ data }): Promise<VerifyResult> => {
    const {
      supabaseAdmin,
      getVisitorSession,
      track,
      verifyInitData,
      checkTelegramMembership,
      MIN_DWELL_SECONDS,
    } = await import("./gate.server");

    const { data: channel } = await supabaseAdmin
      .from("channels")
      .select("id, chat_id, enabled")
      .eq("id", data.channelId)
      .maybeSingle();
    if (!channel || !channel.enabled) throw new Error("Channel not found");

    const session = await getVisitorSession();
    await track("verify_attempt", channel.id);

    const markJoined = async () => {
      await session.update({
        joined: { ...(session.data.joined ?? {}), [channel.id]: Date.now() },
      });
      await track("channel_verified", channel.id);
      return { status: "joined" } as const;
    };

    // Preferred path: real membership check through the Telegram Bot API.
    const botToken = process.env["TELEGRAM_BOT_TOKEN"];
    let tgUserId = session.data.tgUserId ?? null;
    if (botToken && data.initData) {
      const verified = verifyInitData(data.initData, botToken);
      if (verified) {
        tgUserId = verified;
        await session.update({ tgUserId: verified });
      }
    }

    if (botToken && channel.chat_id && tgUserId) {
      const isMember = await checkTelegramMembership(channel.chat_id, tgUserId);
      if (isMember === true) return markJoined();
      if (isMember === false) {
        return {
          status: "not_joined",
          message: "We could not find you in this channel. Join it and try again.",
        };
      }
    }

    // Fallback path: server-tracked click-through with a minimum dwell time.
    const openedAt = session.data.opened?.[channel.id];
    if (!openedAt) {
      return { status: "not_joined", message: "Tap JOIN CHANNEL first, then verify." };
    }
    const elapsed = (Date.now() - openedAt) / 1000;
    if (elapsed < MIN_DWELL_SECONDS) {
      return { status: "too_soon", secondsLeft: Math.ceil(MIN_DWELL_SECONDS - elapsed) };
    }
    return markJoined();
  });

/** Returns the APK link only when every required channel is verified server-side. */
export const requestDownload = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin, getVisitorSession, track } = await import("./gate.server");
  const session = await getVisitorSession();

  const [{ data: apk }, { data: channels }] = await Promise.all([
    supabaseAdmin.from("apk_config").select("*").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("channels").select("id, required").eq("enabled", true),
  ]);

  if (!apk || !apk.enabled || !apk.download_url) {
    throw new Error("Download is currently unavailable.");
  }

  const joined = session.data.joined ?? {};
  const required = (channels ?? []).filter((channel) => channel.required);
  if (required.length === 0 || !required.every((channel) => joined[channel.id])) {
    await track("download_denied");
    throw new Error("Join and verify all required channels first.");
  }

  await track("download");
  return { url: apk.download_url, fileName: `${apk.name} ${apk.version}` };
});
