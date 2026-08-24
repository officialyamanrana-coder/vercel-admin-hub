import { z } from "zod";

export const channelInput = z.object({
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

export const settingsInput = z.object({
  site_name: z.string().trim().min(1).max(60),
  tagline: z.string().trim().min(1).max(140),
  logo_url: z.string().trim().max(500).nullable(),
  favicon_url: z.string().trim().max(500).nullable(),
  footer_text: z.string().trim().max(200),
});

export type SettingsInput = z.input<typeof settingsInput>;

export const apkInput = z.object({
  name: z.string().trim().min(1).max(80),
  version: z.string().trim().min(1).max(30),
  size_label: z.string().trim().max(30),
  description: z.string().trim().max(400),
  download_url: z.string().trim().max(500),
  button_text: z.string().trim().min(1).max(40),
  enabled: z.boolean(),
});

export type ApkInput = z.input<typeof apkInput>;

export const passwordInput = z.object({ password: z.string().min(1).max(200) });
export const idInput = z.object({ id: z.string().uuid() });
export const reorderInput = z.object({ ids: z.array(z.string().uuid()).max(50) });

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
