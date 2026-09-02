// Descarga automatica del Excel de "Precios de venta" desde Chess ERP.
//
// Uso:
//   1) npm install
//   2) cp config.example.json config.json   (y ajustar selectores si hace falta)
//   3) cp .env.example .env                 (y completar usuario/contraseña)
//   4) npm run descargar
//
// Si el login o el boton de exportar no se encuentran, correr:
//   npm run calibrar
// eso abre Playwright Codegen: repetir el login y el export a mano y copiar
// los selectores reales que aparecen en el panel derecho hacia config.json.

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { escribirDatosWeb } = require('./lib-datos');

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  const examplePath = path.join(__dirname, 'config.example.json');
  if (!fs.existsSync(configPath)) {
    console.log('No existe config.json, usando config.example.json como base.');
    return JSON.parse(fs.readFileSync(examplePath, 'utf8'));
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

async function main() {
  const config = loadConfig();
  const user = process.env.CHESS_USER;
  const pass = process.env.CHESS_PASS;
  const headless = process.env.HEADLESS === 'true';

  if (!user || !pass) {
    console.error('Faltan CHESS_USER / CHESS_PASS. Copia .env.example a .env y completalo.');
    process.exit(1);
  }

  const downloadDir = path.resolve(__dirname, config.downloadDir || '../descargas');
  fs.mkdirSync(downloadDir, { recursive: true });

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    console.log('Abriendo Chess...');
    await page.goto(config.precioVentaUrl, { waitUntil: 'networkidle', timeout: config.timeouts.pageLoadMs });

    // Si nos redirige a un login, lo completamos. Si ya hay sesion activa, esto no hace nada.
    const userField = page.locator(config.selectors.userInput).first();
    if (await userField.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Iniciando sesion...');
      await userField.fill(user);
      await page.locator(config.selectors.passInput).first().fill(pass);
      await page.locator(config.selectors.loginButton).first().click();
      await page.waitForLoadState('networkidle', { timeout: config.timeouts.loginMs });
      // Despues de loguear, Chess puede no llevarnos solo a la pantalla de precios: reintentamos.
      await page.goto(config.precioVentaUrl, { waitUntil: 'networkidle', timeout: config.timeouts.pageLoadMs });
    }

    console.log('Ejecutando pasos de exportacion: Exportar lista de precios > Vista completa > Lista 1 - Lista general > Excel...');
    let download = null;
    for (const paso of config.pasosExportacion) {
      console.log(' -', paso.descripcion || paso.selector);
      const el = page.locator(paso.selector).first();
      await el.waitFor({ state: 'visible', timeout: config.timeouts.pageLoadMs });

      if (paso.esperaDescarga) {
        [download] = await Promise.all([
          page.waitForEvent('download', { timeout: config.timeouts.downloadMs }),
          el.click(),
        ]);
      } else {
        await el.click();
        await page.waitForTimeout(config.timeouts.entrePasosMs || 800);
      }
    }

    if (!download) {
      throw new Error('Se ejecutaron los pasos pero ningun paso disparo una descarga. Marca "esperaDescarga": true en el paso que realmente descarga el Excel dentro de config.json.');
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const suggested = download.suggestedFilename() || `precios-${stamp}.xlsx`;
    const destPath = path.join(downloadDir, `${stamp}_${suggested}`);
    await download.saveAs(destPath);
    console.log('Descarga guardada en:', destPath);

    // Deja los datos listos dentro del sistema: al abrir web/index.html ya aparecen,
    // sin tener que subir el Excel a mano.
    const { cantidad } = escribirDatosWeb(destPath, config.columnas);
    console.log(`web/datos.js actualizado con ${cantidad} productos. Abri web/index.html y dale Continuar.`);
  } catch (err) {
    console.error('Algo fallo. Si es la primera vez, corre "npm run calibrar" para obtener los selectores reales de tu Chess y actualizalos en config.json.');
    console.error(err.message);
    await page.screenshot({ path: path.join(downloadDir, 'error-screenshot.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
