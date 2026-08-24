import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const channelInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).default(""),
  username: z.string().trim().min(1).max(80),
  url: z.string().trim().url().max(300),
  chat_id: z.string().trim().max(80).nullable().optional(),
  enabled: z.boolean().default(true),
  required: z.boolean().default(true),
  position: z.number().int().min(0).max(999).default(0),
});

export type ChannelInput = z.input<typeof channelInput>;

const settingsInput = z.object({
  site_name: z.string().trim().min(1).max(60),
  tagline: z.string().trim().min(1).max(140),
  logo_url: z.string().trim().max(500).nullable(),
  favicon_url: z.string().trim().max(500).nullable(),
  footer_text: z.string().trim().max(200),
});

export type SettingsInput = z.input<typeof settingsInput>;

const apkInput = z.object({
  name: z.string().trim().min(1).max(80),
  version: z.string().trim().min(1).max(30),
  size_label: z.string().trim().max(30),
  description: z.string().trim().max(400),
  download_url: z.string().trim().max(500),
  button_text: z.string().trim().min(1).max(40),
  enabled: z.boolean(),
});

export type ApkInput = z.input<typeof apkInput>;

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) =>
    z.object({ password: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { getAdminSession, passwordMatches } = await import("./gate.server");
    const expected = process.env["ADMIN_PASSWORD"];
    if (!expected) throw new Error("ADMIN_PASSWORD is not configured");
    if (!passwordMatches(data.password, expected)) return { ok: false as const };
    const session = await getAdminSession();
    await session.update({ admin: true });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getAdminSession } = await import("./gate.server");
  const session = await getAdminSession();
  await session.clear();
  return { ok: true as const };
});

export const adminSession = createServerFn({ method: "GET" }).handler(async () => {
  const { getAdminSession } = await import("./gate.server");
  const session = await getAdminSession();
  return { authenticated: Boolean(session.data.admin) };
});

export type AdminData = {
  settings: SettingsInput & { id: number };
  apk: ApkInput & { id: number };
  channels: Array<{
    id: string;
    name: string;
    description: string;
    username: string;
    url: string;
    chat_id: string | null;
    enabled: boolean;
    required: boolean;
    position: number;
  }>;
  analytics: {
    visits: number;
    unlocks: number;
    downloads: number;
    verifyAttempts: number;
    botConfigured: boolean;
  };
};

export const getAdminData = createServerFn({ method: "GET" }).handler(async (): Promise<AdminData> => {
  const { requireAdmin, supabaseAdmin } = await import("./gate.server");
  await requireAdmin();

  const [settings, apk, channels, events] = await Promise.all([
    supabaseAdmin.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("apk_config").select("*").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("channels").select("*").order("position", { ascending: true }),
    supabaseAdmin.from("analytics_events").select("event_type"),
  ]);

  const counts = (events.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.event_type] = (acc[row.event_type] ?? 0) + 1;
    return acc;
  }, {});

  return {
    settings: {
      id: 1,
      site_name: settings.data?.site_name ?? "",
      tagline: settings.data?.tagline ?? "",
      logo_url: settings.data?.logo_url ?? null,
      favicon_url: settings.data?.favicon_url ?? null,
      footer_text: settings.data?.footer_text ?? "",
    },
    apk: {
      id: 1,
      name: apk.data?.name ?? "",
      version: apk.data?.version ?? "",
      size_label: apk.data?.size_label ?? "",
      description: apk.data?.description ?? "",
      download_url: apk.data?.download_url ?? "",
      button_text: apk.data?.button_text ?? "DOWNLOAD APK",
      enabled: apk.data?.enabled ?? false,
    },
    channels: (channels.data ?? []).map((channel) => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      username: channel.username,
      url: channel.url,
      chat_id: channel.chat_id,
      enabled: channel.enabled,
      required: channel.required,
      position: channel.position,
    })),
    analytics: {
      visits: counts["visit"] ?? 0,
      unlocks: counts["channel_verified"] ?? 0,
      downloads: counts["download"] ?? 0,
      verifyAttempts: counts["verify_attempt"] ?? 0,
      botConfigured: Boolean(process.env["TELEGRAM_BOT_TOKEN"]),
    },
  };
});

export const saveSettings = createServerFn({ method: "POST" })
  .inputValidator((data: SettingsInput) => settingsInput.parse(data))
  .handler(async ({ data }) => {
    const { requireAdmin, supabaseAdmin } = await import("./gate.server");
    await requireAdmin();
    const { error } = await supabaseAdmin
      .from("site_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const saveApk = createServerFn({ method: "POST" })
  .inputValidator((data: ApkInput) => apkInput.parse(data))
  .handler(async ({ data }) => {
    const { requireAdmin, supabaseAdmin } = await import("./gate.server");
    await requireAdmin();
    const { error } = await supabaseAdmin
      .from("apk_config")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const saveChannel = createServerFn({ method: "POST" })
  .inputValidator((data: ChannelInput) => channelInput.parse(data))
  .handler(async ({ data }) => {
    const { requireAdmin, supabaseAdmin } = await import("./gate.server");
    await requireAdmin();
    const payload = {
      name: data.name,
      description: data.description,
      username: data.username,
      url: data.url,
      chat_id: data.chat_id ?? null,
      enabled: data.enabled,
      required: data.required,
      position: data.position,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("channels").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("channels").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deleteChannel = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { requireAdmin, supabaseAdmin } = await import("./gate.server");
    await requireAdmin();
    const { error } = await supabaseAdmin.from("channels").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const reorderChannels = createServerFn({ method: "POST" })
  .inputValidator((data: { ids: string[] }) =>
    z.object({ ids: z.array(z.string().uuid()).max(50) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { requireAdmin, supabaseAdmin } = await import("./gate.server");
    await requireAdmin();
    await Promise.all(
      data.ids.map((id, index) =>
        supabaseAdmin.from("channels").update({ position: index + 1 }).eq("id", id),
      ),
    );
    return { ok: true as const };
  });
