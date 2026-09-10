#!/usr/bin/env node
/**
 * Script de synchronisation automatique de l'URL du Tunnel avec l'application Expo / EAS
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const API_TS_PATH = path.join(ROOT_DIR, 'src', 'config', 'api.ts');
const EAS_JSON_PATH = path.join(ROOT_DIR, 'eas.json');
const ENV_PATH = path.join(ROOT_DIR, '.env');

function getNgrokUrl() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const httpsTunnel = json.tunnels.find((t) => t.proto === 'https') || json.tunnels[0];
          if (httpsTunnel && httpsTunnel.public_url) {
            resolve(httpsTunnel.public_url);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => {
      resolve(null);
    });
  });
}

async function main() {
  console.log('🔄 Recherche du tunnel ngrok actif...');
  let tunnelUrl = await getNgrokUrl();

  if (!tunnelUrl) {
    console.log('⚠️ Aucun tunnel ngrok détecté sur le port 4040.');
    console.log('ℹ️ Utilisation de l\'IP locale ou de la configuration existante.');
    return;
  }

  console.log(`✅ Tunnel actif détecté : ${tunnelUrl}`);

  // 1. Mise à jour de .env.preview
  const ENV_PREVIEW_PATH = path.join(ROOT_DIR, '.env.preview');
  fs.writeFileSync(
    ENV_PREVIEW_PATH,
    `EXPO_PUBLIC_ENV=preview\nEXPO_PUBLIC_API_URL=${tunnelUrl}\nEXPO_PUBLIC_API_TIMEOUT_MS=15000\n`
  );
  console.log('   📄 frontend/.env.preview mis à jour.');

  // 2. Mise à jour du profil preview dans eas.json
  if (fs.existsSync(EAS_JSON_PATH)) {
    try {
      const easConfig = JSON.parse(fs.readFileSync(EAS_JSON_PATH, 'utf8'));
      if (easConfig.build) {
        ['preview', 'preview-device'].forEach((profile) => {
          if (easConfig.build[profile]) {
            easConfig.build[profile].env = {
              ...easConfig.build[profile].env,
              EXPO_PUBLIC_API_URL: tunnelUrl,
            };
          }
        });
        fs.writeFileSync(EAS_JSON_PATH, JSON.stringify(easConfig, null, 2) + '\n');
        console.log('   📄 frontend/eas.json (profils preview) mis à jour.');
      }
    } catch (e) {
      console.warn('   ⚠️ Erreur mise à jour eas.json:', e.message);
    }
  }

  console.log('🎉 Synchronisation terminée avec succès !');
}

main();
