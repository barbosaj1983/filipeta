// version.js - Configurações de versão centralizadas
const VERSION_CONFIG = {
  MAJOR: 1,
  MINOR: 2,
  PATCH: 1, // Era 0, agora 1
  
  // Gera a string de versão completa
  get FULL() {
    return `${this.MAJOR}.${this.MINOR}.${this.PATCH}`;
  },
  
  // Informações de build
  BUILD_DATE: '2024-12-21', // Atualizar data também
  BUILD_NUMBER: '20241221001', // Atualizar build number
  
  // Metadados da aplicação
  APP_NAME: 'Filipeta - Assistente de Balcão',
  APP_CODE: 'filipeta-assistant',
  COMPANY: 'Filipeta Team',
  COPYRIGHT: '© 2024 Filipeta Team',
  
  // Configurações de update
  UPDATE_CHECK_URL: 'https://api.filipeta.com/updates/check',
  RELEASE_NOTES_URL: 'https://filipeta.com/releases',
  
  // Versões mínimas compatíveis
  MIN_ELECTRON_VERSION: '30.0.0',
  MIN_NODE_VERSION: '16.0.0',
  
  // Features flags baseadas na versão
  FEATURES: {
    ADVANCED_ANALYTICS: true,
    REAL_TIME_SYNC: true,
    MULTI_STORE: false, // Disponível na v1.3.0
    AI_RECOMMENDATIONS: false, // Disponível na v2.0.0
    CLOUD_BACKUP: true,
    OFFLINE_MODE: true
  },
  
  // Changelog da versão atual
  CHANGELOG: [
    '✨ Botões modernos e profissionais',
    '📊 Identificação visual de versão',
    '🎨 Interface redesenhada',
    '📋 Melhor feedback ao copiar',
    '🔧 Sistema de controle de versão',
    '🚀 Performance otimizada'
  ],
  
  // Informações de compatibilidade
  COMPATIBILITY: {
    DATABASE_SCHEMA_VERSION: '1.1.0',
    API_VERSION: '1.0.0',
    CONFIG_FORMAT_VERSION: '1.0.0'
  }
};

// Função para verificar se uma feature está habilitada
function isFeatureEnabled(featureName) {
  return VERSION_CONFIG.FEATURES[featureName] || false;
}

// Função para obter informações completas da versão
function getVersionInfo() {
  return {
    version: VERSION_CONFIG.FULL,
    buildDate: VERSION_CONFIG.BUILD_DATE,
    buildNumber: VERSION_CONFIG.BUILD_NUMBER,
    appName: VERSION_CONFIG.APP_NAME,
    copyright: VERSION_CONFIG.COPYRIGHT,
    features: VERSION_CONFIG.FEATURES,
    changelog: VERSION_CONFIG.CHANGELOG,
    compatibility: VERSION_CONFIG.COMPATIBILITY
  };
}

// Função para verificar compatibilidade
function checkCompatibility(minVersion) {
  const current = VERSION_CONFIG.FULL.split('.').map(Number);
  const required = minVersion.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (current[i] > required[i]) return true;
    if (current[i] < required[i]) return false;
  }
  return true;
}

module.exports = {
  VERSION_CONFIG,
  isFeatureEnabled,
  getVersionInfo,
  checkCompatibility
};