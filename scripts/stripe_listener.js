// Local sandbox only. Credentials stay in the environment and are never logged.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const root = path.resolve(__dirname, '..');
const configFile = path.join(root, '.env.stripe-test');
const config = require('dotenv').parse(fs.readFileSync(configFile));
if (!/^sk_test_[A-Za-z0-9]{80,}$/.test(config.STRIPE_SECRET_KEY || '')) throw new Error('Se requiere una clave de Stripe de prueba.');
const shim = path.join(root, '.tools/stripe/node_modules/@stripe/cli/bin/shim.js');
if (!fs.existsSync(shim)) throw new Error('Instala la herramienta oficial: npm install --prefix .tools/stripe --no-save --package-lock=false @stripe/cli@1.53.0');
const child = spawn(process.execPath, [shim, 'listen', '--skip-update', '--events', 'checkout.session.completed,invoice.paid,invoice.payment_failed,customer.subscription.deleted', '--forward-to', 'http://127.0.0.1:3101/api/suscripcion/webhook'], {
  env: { ...process.env, STRIPE_API_KEY: config.STRIPE_SECRET_KEY }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let pending = '';
function output(chunk) {
  pending += chunk.toString();
  const lines = pending.split(/\r?\n/);
  pending = lines.pop();
  for (let line of lines) {
    const secret = line.match(/whsec_[A-Za-z0-9]+/)?.[0];
    if (secret) {
      const current = fs.readFileSync(configFile, 'utf8').replace(/^STRIPE_WEBHOOK_SECRET=.*(?:\r?\n|$)/gm, '');
      fs.writeFileSync(configFile, current.trimEnd() + '\nSTRIPE_WEBHOOK_SECRET=' + secret + '\n', { mode: 0o600 });
      console.log('Avisos de Stripe conectados. Firma guardada en la configuración local.');
    }
    line = line.replace(/(?:sk|rk|pk)_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+/g, '[oculto]');
    if (!secret && line.trim()) console.log(line);
  }
}
child.stdout.on('data', output); child.stderr.on('data', output);
child.on('error', () => { console.error('No se pudo iniciar el listener de Stripe.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });
process.on('SIGINT', () => child.kill()); process.on('SIGTERM', () => child.kill());
