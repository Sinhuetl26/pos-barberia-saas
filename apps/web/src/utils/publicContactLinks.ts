type SocialProvider = 'instagram' | 'facebook' | 'tiktok';
const socialHosts: Record<SocialProvider, string[]> = {
  instagram: ['instagram.com', 'www.instagram.com'],
  facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com', 'www.fb.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com'],
};

/** Accept historical handles and provider URLs without rendering arbitrary links. */
export function publicSocialHref(provider: SocialProvider, raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 2048) return '';
  const value = raw.trim();
  if (/^@?[a-z\d._-]+$/i.test(value)) {
    const handle = value.replace(/^@/, '');
    const base = provider === 'tiktok' ? 'https://www.tiktok.com/@' : `https://www.${provider}.com/`;
    return `${base}${encodeURIComponent(handle)}`;
  }
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port || !socialHosts[provider].includes(url.hostname.toLowerCase())) return '';
    url.protocol = 'https:';
    return url.href;
  } catch { return ''; }
}

export function publicEmailHref(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const value = raw.trim();
  if (value.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)) return '';
  return `mailto:${encodeURIComponent(value)}`;
}
