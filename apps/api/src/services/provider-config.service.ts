// Pure configuration checks shared by the catalog and the actual provider flows.
// Passing these checks does not prove a remote payment, delivery or fiscal review.
export function configuredValue(value?: string): boolean {
  return Boolean(value?.trim() && !/your_|example|\.\.\.|123456789|abcdefg/i.test(value));
}

export function publicAppOrigin(env: NodeJS.ProcessEnv = process.env): string {
  try {
    const value = env.APP_URL || env.FRONTEND_URL || (env.NODE_ENV !== 'production' ? 'http://127.0.0.1:5179' : '');
    const url = new URL(value);
    const localHttp = env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || (url.protocol !== 'https:' && !localHttp)) throw new Error();
    return url.origin;
  } catch {
    throw Object.assign(new Error('Configura el dominio público seguro antes de enviar enlaces o abrir pagos.'), { status: 503, code: 'PUBLIC_APP_URL_INVALID' });
  }
}

export function licenseCheckoutReadiness(code: string, env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === 'production';
  const issues: string[] = [];
  const key = env.STRIPE_SECRET_KEY || '';
  if (!configuredValue(key) || !(production ? /^sk_live_/ : /^sk_test_/).test(key)) issues.push(production ? 'Configurar Stripe en modo real.' : 'Configurar Stripe en modo de prueba.');
  if (!configuredValue(env.STRIPE_WEBHOOK_SECRET) || !/^whsec_/.test(env.STRIPE_WEBHOOK_SECRET || '')) issues.push('Configurar la firma del webhook de pagos.');
  const price = env[`STRIPE_PRICE_${code}_${production ? 'LIVE' : 'TEST'}`] || (!production ? env[`STRIPE_PRICE_${code}`] : '');
  if (!configuredValue(price) || !/^price_[A-Za-z0-9_]+$/.test(price || '')) issues.push('Conectar el precio de este plan al entorno correcto.');
  try { publicAppOrigin(env); } catch { issues.push('Configurar el dominio público seguro.'); }
  if (production && (!['IVA_INCLUIDO', 'MAS_IVA_16'].includes(env.LICENSE_TAX_POLICY || '') || env.LICENSE_FISCAL_REVIEWED !== 'true')) issues.push('Completar la configuración y revisión fiscal de la licencia.');
  return { ready: issues.length === 0, mode: production ? 'live' : 'test', issues };
}
