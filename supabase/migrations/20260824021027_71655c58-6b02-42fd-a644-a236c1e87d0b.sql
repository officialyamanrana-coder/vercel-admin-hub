CREATE TABLE public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  site_name TEXT NOT NULL DEFAULT 'APK WORLD',
  tagline TEXT NOT NULL DEFAULT 'Download Premium APKs Safely & Easily',
  logo_url TEXT,
  favicon_url TEXT,
  footer_text TEXT NOT NULL DEFAULT '© APK WORLD. All rights reserved.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL,
  url TEXT NOT NULL,
  chat_id TEXT,
  position INT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.channels TO service_role;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.apk_config (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'Premium APK',
  version TEXT NOT NULL DEFAULT '1.0.0',
  size_label TEXT NOT NULL DEFAULT '24 MB',
  description TEXT NOT NULL DEFAULT 'Latest premium build, safe and virus free.',
  download_url TEXT NOT NULL DEFAULT '',
  button_text TEXT NOT NULL DEFAULT 'DOWNLOAD APK',
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT apk_config_singleton CHECK (id = 1)
);
GRANT ALL ON public.apk_config TO service_role;
ALTER TABLE public.apk_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  channel_id UUID,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX analytics_events_type_idx ON public.analytics_events (event_type, created_at DESC);
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

INSERT INTO public.site_settings (id) VALUES (1);
INSERT INTO public.apk_config (id, name, version, description, download_url)
VALUES (1, 'APK WORLD Premium', '2.4.1', 'Ad-free premium build with all features unlocked. Scanned and safe.', 'https://example.com/apkworld-premium-2.4.1.apk');

INSERT INTO public.channels (name, description, username, url, position) VALUES
('APK WORLD OFFICIAL', 'Get latest APK updates & releases', '@apkworld_official', 'https://t.me/apkworld_official', 1),
('APK WORLD UPDATES', 'Daily modded app drops and patches', '@apkworld_updates', 'https://t.me/apkworld_updates', 2),
('APK WORLD NEWS', 'Announcements, giveaways and news', '@apkworld_news', 'https://t.me/apkworld_news', 3);