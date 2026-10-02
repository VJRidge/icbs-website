import { useEffect, useMemo } from 'react';
import type { SocialEmbedPlatform } from './socialEmbed';

declare global {
  interface Window {
    instgrm?: { Embeds?: { process: () => void } };
    tiktokEmbed?: { load?: () => void };
    FB?: { XFBML?: { parse: (node?: HTMLElement) => void } };
  }
}

function loadScript(id: string, src: string, opts?: { defer?: boolean; crossOrigin?: string }) {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.src = src;
  script.async = true;
  if (opts?.defer) script.defer = true;
  if (opts?.crossOrigin) script.crossOrigin = opts.crossOrigin;
  document.body.appendChild(script);
}

function ensureFbRoot() {
  if (!document.getElementById('fb-root')) {
    const div = document.createElement('div');
    div.id = 'fb-root';
    document.body.appendChild(div);
  }
}

function processEmbeds(platforms: Set<SocialEmbedPlatform>) {
  if (platforms.has('instagram') && window.instgrm?.Embeds?.process) {
    window.instgrm.Embeds.process();
  }
  if (platforms.has('tiktok') && window.tiktokEmbed?.load) {
    window.tiktokEmbed.load();
  }
  if (platforms.has('facebook') && window.FB?.XFBML?.parse) {
    window.FB.XFBML.parse();
  }
}

export function useSocialEmbedScripts(platforms: SocialEmbedPlatform[]) {
  const key = useMemo(() => platforms.slice().sort().join(','), [platforms]);

  useEffect(() => {
    if (!key) return;
    const set = new Set(platforms);

    if (set.has('instagram')) {
      loadScript('hbcu-instagram-embed', 'https://www.instagram.com/embed.js');
    }
    if (set.has('tiktok')) {
      loadScript('hbcu-tiktok-embed', 'https://www.tiktok.com/embed.js');
    }
    if (set.has('facebook')) {
      ensureFbRoot();
      loadScript('hbcu-facebook-sdk', 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0', {
        defer: true,
        crossOrigin: 'anonymous',
      });
    }
    if (set.has('linkedin')) {
      loadScript('hbcu-linkedin-embed', 'https://platform.linkedin.com/in.js');
    }

    const timer = window.setTimeout(() => processEmbeds(set), 600);
    const retry = window.setTimeout(() => processEmbeds(set), 1800);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(retry);
    };
  }, [key, platforms]);
}
