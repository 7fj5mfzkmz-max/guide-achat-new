'use strict';
/**
 * Test d'intégration DeepL
 * Usage: npm run deepl:test
 * Environnement: DEEPL_API_KEY doit être défini
 */

const https = require('https');
const querystring = require('querystring');

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = 'https://api-free.deepl.com/v1/translate';

// 5 chaînes de test en français
const TEST_STRINGS = [
  'Guide d\'achat complet pour smartphones',
  'Batterie externe haute capacité recommandée',
  'Écouteurs sans fil avec réduction de bruit active',
  'Projecteur portable full HD pour présentation',
  'Catalogue complet des ordinateurs portables'
];

const TARGET_LANGUAGES = ['EN', 'ES'];

function translateWithDeepL(text, targetLang) {
  return new Promise((resolve, reject) => {
    if (!DEEPL_API_KEY) {
      return reject(new Error('DEEPL_API_KEY environment variable is not set'));
    }

    const data = querystring.stringify({
      auth_key: DEEPL_API_KEY,
      text: text,
      target_lang: targetLang,
      formality: 'default'
    });

    const options = {
      hostname: 'api-free.deepl.com',
      path: '/v1/translate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.translations && result.translations[0]) {
            resolve(result.translations[0].text);
          } else if (result.message) {
            reject(new Error(`DeepL API error: ${result.message}`));
          } else {
            reject(new Error('Unexpected DeepL API response'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse DeepL response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Démarrage du test d\'intégration DeepL\n');
  console.log(`📝 ${TEST_STRINGS.length} chaînes à tester`);
  console.log(`🌐 Langues cibles: ${TARGET_LANGUAGES.join(', ')}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < TEST_STRINGS.length; i++) {
    const originalText = TEST_STRINGS[i];
    console.log(`\n[${i + 1}/${TEST_STRINGS.length}] ${originalText}`);
    console.log('─'.repeat(80));

    for (const lang of TARGET_LANGUAGES) {
      try {
        const translated = await translateWithDeepL(originalText, lang);
        console.log(`  ✅ ${lang}: ${translated}`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ ${lang}: ${error.message}`);
        errorCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Résultats:`);
  console.log(`  ✅ Traductions réussies: ${successCount}`);
  console.log(`  ❌ Erreurs: ${errorCount}`);
  console.log(`  📈 Taux de réussite: ${Math.round((successCount / (successCount + errorCount)) * 100)}%\n`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('\n💥 Erreur fatale:', error.message);
  process.exit(2);
});
