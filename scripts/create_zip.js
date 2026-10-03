/**
 * SYSTECH Studio - Cross-Platform Zip Packager
 * Generates a clean, portable .zip with forward slashes (Linux/Mac/Docker compatible)
 * Resolves finding M11 from the audit report.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const zipFile = path.join(rootDir, 'POS_Barberia_Software.zip');

console.log('📦 Creando paquete de distribución portable (POS_Barberia_Software.zip)...');

if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

try {
  // Use git archive for 100% standard forward-slash zip structure without git internals/node_modules
  execSync(`git archive -o "${zipFile}" HEAD`, { cwd: rootDir, stdio: 'inherit' });
  const stats = fs.statSync(zipFile);
  console.log(`✅ Archivo ZIP generado con éxito: POS_Barberia_Software.zip (${(stats.size / 1024).toFixed(1)} KB)`);
  console.log('🌐 Estructura compatible con Windows, Linux, macOS y Docker (rutas con "/")');
} catch (error) {
  console.error('❌ Error al generar el zip con git archive:', error.message);
  process.exit(1);
}
