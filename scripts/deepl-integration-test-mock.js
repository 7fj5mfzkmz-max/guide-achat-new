'use strict';
/**
 * Test d'intégration DeepL avec données mockées
 * Démontre l'intégration DeepL sans clé API réelle
 * Usage: node scripts/deepl-integration-test-mock.js
 */

// 5 chaînes de test en français
const TEST_STRINGS = [
  'Guide d\'achat complet pour smartphones',
  'Batterie externe haute capacité recommandée',
  'Écouteurs sans fil avec réduction de bruit active',
  'Projecteur portable full HD pour présentation',
  'Catalogue complet des ordinateurs portables'
];

// Données mockées pour démonstration
const MOCK_TRANSLATIONS = {
  'Guide d\'achat complet pour smartphones': {
    EN: 'Complete buying guide for smartphones',
    ES: 'Guía completa de compra para smartphones'
  },
  'Batterie externe haute capacité recommandée': {
    EN: 'Recommended high-capacity external battery',
    ES: 'Batería externa de alta capacidad recomendada'
  },
  'Écouteurs sans fil avec réduction de bruit active': {
    EN: 'Wireless headphones with active noise reduction',
    ES: 'Auriculares inalámbricos con reducción activa de ruido'
  },
  'Projecteur portable full HD pour présentation': {
    EN: 'Portable full HD projector for presentation',
    ES: 'Proyector portátil full HD para presentación'
  },
  'Catalogue complet des ordinateurs portables': {
    EN: 'Complete catalog of laptops',
    ES: 'Catálogo completo de ordenadores portátiles'
  }
};

const TARGET_LANGUAGES = ['EN', 'ES'];

function getTranslation(text, targetLang) {
  return new Promise((resolve, reject) => {
    // Simulation d'un délai réseau
    setTimeout(() => {
      if (MOCK_TRANSLATIONS[text] && MOCK_TRANSLATIONS[text][targetLang]) {
        resolve(MOCK_TRANSLATIONS[text][targetLang]);
      } else {
        reject(new Error(`Translation not found for "${text}" to ${targetLang}`));
      }
    }, 100);
  });
}

async function runTests() {
  console.log('🚀 Démarrage du test d\'intégration DeepL (Mock)\n');
  console.log(`📝 ${TEST_STRINGS.length} chaînes à tester`);
  console.log(`🌐 Langues cibles: ${TARGET_LANGUAGES.join(', ')}\n`);
  console.log('⚠️  Mode démonstration avec données mockées\n');

  let successCount = 0;
  let errorCount = 0;
  const results = [];

  for (let i = 0; i < TEST_STRINGS.length; i++) {
    const originalText = TEST_STRINGS[i];
    const translations = {};

    console.log(`\n[${i + 1}/${TEST_STRINGS.length}] ${originalText}`);
    console.log('─'.repeat(80));

    for (const lang of TARGET_LANGUAGES) {
      try {
        const translated = await getTranslation(originalText, lang);
        console.log(`  ✅ ${lang}: ${translated}`);
        translations[lang] = translated;
        successCount++;
      } catch (error) {
        console.error(`  ❌ ${lang}: ${error.message}`);
        errorCount++;
      }
    }

    results.push({
      original: originalText,
      translations
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Résultats:`);
  console.log(`  ✅ Traductions réussies: ${successCount}`);
  console.log(`  ❌ Erreurs: ${errorCount}`);
  console.log(`  📈 Taux de réussite: ${Math.round((successCount / (successCount + errorCount)) * 100)}%\n`);

  // Affichage du résumé en JSON
  console.log('📋 Résumé complet:\n');
  console.log(JSON.stringify(results, null, 2));

  if (errorCount > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('\n💥 Erreur fatale:', error.message);
  process.exit(2);
});
