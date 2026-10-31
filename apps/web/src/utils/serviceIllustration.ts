// Example service imagery; never use these photos as a professional's identity.
export function serviceIllustration(name: string): string | null {
  const normalized = name.toLocaleLowerCase('es');
  const image = /corte.*barba|barba.*corte/.test(normalized) ? 'corte-barba'
    : /degradado|fade/.test(normalized) ? 'degradado'
    : /barba/.test(normalized) ? 'barba'
    : /corte/.test(normalized) ? 'corte-clasico' : null;
  return image ? `/pos-studio/${image}.webp` : null;
}
