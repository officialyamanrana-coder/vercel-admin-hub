import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  LogOut,
  Package,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminLogin,
  adminLogout,
  adminSession,
  deleteChannel,
  getAdminData,
  reorderChannels,
  saveApk,
  saveChannel,
  saveSettings,
  type AdminData,
  type ApkInput,
  type ChannelInput,
  type SettingsInput,
} from "@/lib/admin.functions";

const sessionQuery = queryOptions({
  queryKey: ["admin-session"],
  queryFn: () => adminSession(),
  staleTime: 0,
});

const adminQuery = queryOptions({
  queryKey: ["admin-data"],
  queryFn: () => getAdminData(),
  retry: false,
  staleTime: 5_000,
});

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — APK WORLD" },
      {
        name: "description",
        content:
          "Manage APK details, Telegram channel gates, branding and download analytics for APK WORLD.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Panel — APK WORLD" },
      { property: "og:description", content: "Internal control panel for APK WORLD." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: session, isLoading } = useQuery(sessionQuery);

  if (isLoading) {
    return (
      <div className="page-glow min-h-screen px-4 py-16">
        <div className="mx-auto w-full max-w-md space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  return session?.authenticated ? <Dashboard /> : <LoginCard />;
}

function LoginCard() {
  const login = useServerFn(adminLogin);
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      const result = await login({ data: { password } });
      if (!result.ok) {
        toast.error("Wrong password");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey });
      await queryClient.invalidateQueries({ queryKey: adminQuery.queryKey });
      toast.success("Welcome back");
    } catch {
      toast.error("Login failed. Try again.");
    } finally {
      setPending(false);
      setPassword("");
    }
  };

  return (
    <div className="page-glow flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="glass w-full max-w-sm rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold uppercase tracking-wide">Admin login</h1>
            <p className="text-xs text-muted-foreground">Enter the admin password to continue.</p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <Button type="submit" className="mt-5 w-full" disabled={pending || !password}>
          {pending ? "Checking..." : "Unlock panel"}
        </Button>

        <Link
          to="/"
          className="mt-4 block text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          Back to site
        </Link>
      </form>
    </div>
  );
}

function Dashboard() {
  const { data, isLoading, error } = useQuery(adminQuery);
  const logout = useServerFn(adminLogout);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (error) toast.error("Session expired. Please log in again.");
  }, [error]);

  const handleLogout = async () => {
    await logout({});
    await queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey });
    queryClient.removeQueries({ queryKey: adminQuery.queryKey });
  };

  if (isLoading || !data) {
    return (
      <div className="page-glow min-h-screen px-4 py-12">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <Skeleton className="h-12 w-56" />
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-glow min-h-screen pb-16">
      <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 pt-10">
        <div>
          <h1 className="text-gradient-brand text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">
            Admin panel
          </h1>
          <p className="text-xs text-muted-foreground">
            {data.settings.site_name} · control content, gates and downloads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/">View site</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
            <LogOut className="size-4" /> Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto mt-7 w-full max-w-3xl px-4">
        <AnalyticsCards analytics={data.analytics} />

        <Tabs defaultValue="channels" className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="channels" className="flex-1">
              <Users className="size-4" /> Channels
            </TabsTrigger>
            <TabsTrigger value="apk" className="flex-1">
              <Package className="size-4" /> APK
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex-1">
              <Settings2 className="size-4" /> Branding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="channels" className="mt-4">
            <ChannelsPanel channels={data.channels} />
          </TabsContent>
          <TabsContent value="apk" className="mt-4">
            <ApkPanel apk={data.apk} />
          </TabsContent>
          <TabsContent value="branding" className="mt-4">
            <BrandingPanel settings={data.settings} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function AnalyticsCards({ analytics }: { analytics: AdminData["analytics"] }) {
  const cards = [
    { label: "Visits", value: analytics.visits, icon: Eye },
    { label: "Verified joins", value: analytics.unlocks, icon: Check },
    { label: "Downloads", value: analytics.downloads, icon: Download },
    { label: "Verify attempts", value: analytics.verifyAttempts, icon: BarChart3 },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="glass rounded-2xl p-4">
          <card.icon className="size-4 text-primary" />
          <p className="mt-2 text-2xl font-extrabold">{card.value}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {card.label}
          </p>
        </div>
      ))}
      <div className="col-span-2 flex items-center gap-2 rounded-2xl border border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground sm:col-span-4">
        <ShieldCheck
          className={analytics.botConfigured ? "size-4 text-success" : "size-4 text-muted-foreground"}
        />
        {analytics.botConfigured
          ? "Telegram bot connected — real membership checks active"
          : "No Telegram bot token — using timed click-through verification"}
      </div>
    </section>
  );
}

type ChannelRow = AdminData["channels"][number];

function emptyChannel(position: number): ChannelInput {
  return {
    name: "",
    description: "",
    username: "",
    url: "",
    chat_id: "",
    enabled: true,
    required: true,
    position,
  };
}

function ChannelsPanel({ channels }: { channels: ChannelRow[] }) {
  const save = useServerFn(saveChannel);
  const remove = useServerFn(deleteChannel);
  const reorder = useServerFn(reorderChannels);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ChannelInput | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: adminQuery.queryKey });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    try {
      await save({
        data: { ...draft, chat_id: draft.chat_id?.toString().trim() ? draft.chat_id : null },
      });
      toast.success(draft.id ? "Channel updated" : "Channel added");
      setDraft(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save channel");
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...channels];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const current = next[index]!;
    next[index] = next[target]!;
    next[target] = current;
    try {
      await reorder({ data: { ids: next.map((channel) => channel.id) } });
      await refresh();
    } catch {
      toast.error("Could not reorder channels");
    }
  };

  const toggle = async (channel: ChannelRow, patch: Partial<ChannelRow>) => {
    try {
      await save({ data: { ...channel, ...patch } });
      await refresh();
    } catch {
      toast.error("Could not update channel");
    }
  };

  const destroy = async (id: string) => {
    if (!window.confirm("Delete this channel?")) return;
    try {
      await remove({ data: { id } });
      toast.success("Channel deleted");
      await refresh();
    } catch {
      toast.error("Could not delete channel");
    }
  };

  return (
    <div className="space-y-3">
      {channels.length === 0 && (
        <p className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          No channels yet. Add the first one below.
        </p>
      )}

      {channels.map((channel, index) => (
        <div key={channel.id} className="glass rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold">{channel.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {channel.username} · {channel.url}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {channel.chat_id ? `chat id ${channel.chat_id}` : "no chat id — timed verify"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move up"
                  onClick={() => void move(index, -1)}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move down"
                  onClick={() => void move(index, 1)}
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
              <Switch
                checked={channel.enabled}
                onCheckedChange={(value) => void toggle(channel, { enabled: value })}
              />
              Enabled
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
              <Switch
                checked={channel.required}
                onCheckedChange={(value) => void toggle(channel, { required: value })}
              />
              Required
            </label>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDraft({ ...channel, chat_id: channel.chat_id ?? "" })}
              >
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void destroy(channel.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {draft ? (
        <form onSubmit={submit} className="glass space-y-3 rounded-2xl p-4">
          <h3 className="text-sm font-extrabold uppercase tracking-widest">
            {draft.id ? "Edit channel" : "New channel"}
          </h3>
          <Field label="Channel name">
            <Input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              required
            />
          </Field>
          <Field label="Description">
            <Input
              value={draft.description ?? ""}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </Field>
          <Field label="Username (@handle)">
            <Input
              value={draft.username}
              onChange={(event) => setDraft({ ...draft, username: event.target.value })}
              required
            />
          </Field>
          <Field label="Invite link">
            <Input
              type="url"
              value={draft.url}
              onChange={(event) => setDraft({ ...draft, url: event.target.value })}
              placeholder="https://t.me/yourchannel"
              required
            />
          </Field>
          <Field label="Telegram chat id (optional, enables real checks)">
            <Input
              value={draft.chat_id ?? ""}
              onChange={(event) => setDraft({ ...draft, chat_id: event.target.value })}
              placeholder="-1001234567890"
            />
          </Field>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
              <Switch
                checked={draft.enabled ?? true}
                onCheckedChange={(value) => setDraft({ ...draft, enabled: value })}
              />
              Enabled
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
              <Switch
                checked={draft.required ?? true}
                onCheckedChange={(value) => setDraft({ ...draft, required: value })}
              />
              Required
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Save channel</Button>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setDraft(emptyChannel(channels.length + 1))}
        >
          <Plus className="size-4" /> Add channel
        </Button>
      )}
    </div>
  );
}

function ApkPanel({ apk }: { apk: AdminData["apk"] }) {
  const save = useServerFn(saveApk);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ApkInput>(apk);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      await save({ data: form });
      toast.success("APK details saved");
      await queryClient.invalidateQueries({ queryKey: adminQuery.queryKey });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass space-y-3 rounded-2xl p-4">
      <Field label="APK name">
        <Input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Version">
          <Input
            value={form.version}
            onChange={(event) => setForm({ ...form, version: event.target.value })}
            required
          />
        </Field>
        <Field label="Size label">
          <Input
            value={form.size_label}
            onChange={(event) => setForm({ ...form, size_label: event.target.value })}
            placeholder="24 MB"
          />
        </Field>
      </div>
      <Field label="Description">
        <Textarea
          rows={3}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
      </Field>
      <Field label="Download URL">
        <Input
          value={form.download_url}
          onChange={(event) => setForm({ ...form, download_url: event.target.value })}
          placeholder="https://cdn.example.com/app.apk"
        />
      </Field>
      <Field label="Button text">
        <Input
          value={form.button_text}
          onChange={(event) => setForm({ ...form, button_text: event.target.value })}
          required
        />
      </Field>
      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
        <Switch
          checked={form.enabled}
          onCheckedChange={(value) => setForm({ ...form, enabled: value })}
        />
        Download enabled
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save APK details"}
      </Button>
    </form>
  );
}

function BrandingPanel({ settings }: { settings: AdminData["settings"] }) {
  const save = useServerFn(saveSettings);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsInput>(settings);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      await save({
        data: {
          ...form,
          logo_url: form.logo_url?.trim() ? form.logo_url : null,
          favicon_url: form.favicon_url?.trim() ? form.favicon_url : null,
        },
      });
      toast.success("Branding saved");
      await queryClient.invalidateQueries({ queryKey: adminQuery.queryKey });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass space-y-3 rounded-2xl p-4">
      <Field label="Site name">
        <Input
          value={form.site_name}
          onChange={(event) => setForm({ ...form, site_name: event.target.value })}
          required
        />
      </Field>
      <Field label="Tagline">
        <Input
          value={form.tagline}
          onChange={(event) => setForm({ ...form, tagline: event.target.value })}
          required
        />
      </Field>
      <Field label="Logo URL">
        <Input
          value={form.logo_url ?? ""}
          onChange={(event) => setForm({ ...form, logo_url: event.target.value })}
          placeholder="https://..."
        />
      </Field>
      <Field label="Favicon URL">
        <Input
          value={form.favicon_url ?? ""}
          onChange={(event) => setForm({ ...form, favicon_url: event.target.value })}
          placeholder="https://..."
        />
      </Field>
      <Field label="Footer text">
        <Input
          value={form.footer_text}
          onChange={(event) => setForm({ ...form, footer_text: event.target.value })}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save branding"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
