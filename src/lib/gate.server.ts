// Server-only helpers: encrypted sessions, Telegram verification, analytics.
import { useSession } from "@tanstack/react-start/server";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export { supabaseAdmin };

/** Minimum seconds a visitor must have spent on the channel before we accept the join. */
export const MIN_DWELL_SECONDS = 6;

function sessionPassword(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  return secret;
}

export type VisitorSession = {
  visited?: boolean;
  /** channelId -> unix ms when the visitor opened the channel link */
  opened?: Record<string, number>;
  /** channelId -> unix ms when membership was verified server-side */
  joined?: Record<string, number>;
  /** verified telegram user id, when the site is opened inside Telegram */
  tgUserId?: number;
};

export type AdminSession = { admin?: boolean };

export function getVisitorSession() {
  return useSession<VisitorSession>({
    password: sessionPassword(),
    name: "apk-gate",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  });
}

export function getAdminSession() {
  return useSession<AdminSession>({
    password: sessionPassword(),
    name: "apk-admin",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  });
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.data.admin) throw new Error("Unauthorized");
  return session;
}

export function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export async function track(
  eventType: string,
  channelId?: string | null,
  meta: Record<string, unknown> = {},
) {
  try {
    await supabaseAdmin.from("analytics_events").insert({
      event_type: eventType,
      channel_id: channelId ?? null,
      meta: meta as never,
    });
  } catch (error) {
    console.error("[analytics] failed", error);
  }
}

/** Validates Telegram Mini App initData and returns the verified user id. */
export function verifyInitData(initData: string, botToken: string): number | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const dataCheckString = [...params.entries()]
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join("\n");
    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (computed !== hash) return null;
    const user = params.get("user");
    if (!user) return null;
    const parsed = JSON.parse(user) as { id?: number };
    return typeof parsed.id === "number" ? parsed.id : null;
  } catch {
    return null;
  }
}

/** True/false from the Telegram Bot API, or null when the bot cannot answer. */
export async function checkTelegramMembership(
  chatId: string,
  userId: number,
): Promise<boolean | null> {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) return null;
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent(
        chatId,
      )}&user_id=${userId}`,
    );
    const payload = (await response.json()) as {
      ok?: boolean;
      result?: { status?: string };
    };
    if (!payload.ok || !payload.result?.status) return null;
    return ["creator", "administrator", "member", "restricted"].includes(payload.result.status);
  } catch (error) {
    console.error("[telegram] getChatMember failed", error);
    return null;
  }
}
