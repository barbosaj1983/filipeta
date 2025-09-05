// preload.js - VERSÃO IPC COM POPUP USO CONTÍNUO + UPDATE API
const { contextBridge, ipcRenderer } = require('electron');

console.log('🚀 Preload.js iniciando (versão IPC)...');

const onlyDigits = (s = '') => String(s).replace(/\D/g, '');

// =============================
// EXPOSIÇÃO DE APIs VIA IPC
// =============================

console.log('📡 Expondo APIs via IPC...');

try {
  // API de Banco de Dados (via IPC para main process)
  contextBridge.exposeInMainWorld('DB', {
    buscarClientePorCpf: (cpf) => {
      console.log('📤 IPC: buscarClientePorCpf', cpf);
      return ipcRenderer.invoke('db-buscar-cliente-cpf', cpf);
    },
    
    buscarRecomendacoesCpf: (cpf, limit = 6) => {
      console.log('📤 IPC: buscarRecomendacoesCpf', cpf, limit);
      return ipcRenderer.invoke('db-buscar-recomendacoes-cpf', cpf, limit);
    },
    
    buscarMaisConsumidos: (cpf, limit = 6) => {
      console.log('📤 IPC: buscarMaisConsumidos', cpf, limit);
      return ipcRenderer.invoke('db-buscar-mais-consumidos', cpf, limit);
    },
    
    buscarProdutoPorEan: (ean) => {
      console.log('📤 IPC: buscarProdutoPorEan', ean);
      return ipcRenderer.invoke('db-buscar-produto-ean', ean);
    },
    
    buscarVendidosJuntos: (ean, limit = 6) => {
      console.log('📤 IPC: buscarVendidosJuntos', ean, limit);
      return ipcRenderer.invoke('db-buscar-vendidos-juntos', ean, limit);
    },
    
    testarConexao: () => {
      console.log('📤 IPC: testarConexao');
      return ipcRenderer.invoke('db-testar-conexao');
    },
    
    limparCache: () => {
      console.log('📤 IPC: limparCache');
      return ipcRenderer.invoke('db-limpar-cache');
    },
    
    getCacheStats: () => {
      console.log('📤 IPC: getCacheStats');
      return ipcRenderer.invoke('db-cache-stats');
    }
  });
  console.log('✅ API DB (IPC) exposta com sucesso');

  // API do Electron (IPC para controle de janela + popup + UPDATE)
  contextBridge.exposeInMainWorld('electronAPI', {
    minimizeWindow: () => {
      console.log('📤 IPC: minimizeWindow');
      return ipcRenderer.invoke('minimize-window');
    },
    
    restoreWindow: () => {
      console.log('📤 IPC: restoreWindow');
      return ipcRenderer.invoke('restore-window');
    },
    
    getAppInfo: () => {
      console.log('📤 IPC: getAppInfo');
      return ipcRenderer.invoke('get-app-info');
    },

    // ========================================
    // FUNÇÕES PARA POPUP DE USO CONTÍNUO
    // ========================================
    
    abrirPopupUsoContinuo: (cpf) => {
      console.log('📤 IPC: abrirPopupUsoContinuo', cpf);
      return ipcRenderer.invoke('abrir-popup-uso-continuo', cpf);
    },
    
    buscarProdutosUsoContinuo: (cpf) => {
      console.log('📤 IPC: buscarProdutosUsoContinuo', cpf);
      return ipcRenderer.invoke('buscar-produtos-uso-continuo', cpf);
    },

    // ========================================
    // 🔄 NOVA: API DE UPDATE SEGURA
    // ========================================
    
    /**
     * Baixa e instala atualização de forma segura
     * @param {Object} updateInfo - Informações da atualização (url, filename, version)
     * @returns {Promise<Object>} Resultado da operação
     */
    downloadAndInstallUpdate: (updateInfo) => {
      console.log('📤 IPC: downloadAndInstallUpdate', updateInfo);
      return ipcRenderer.invoke('downloadAndInstallUpdate', updateInfo);
    },

    /**
     * Verifica se há atualizações disponíveis
     * @returns {Promise<Object>} Resultado da verificação
     */
    checkForUpdates: () => {
      console.log('📤 IPC: updater-check-for-updates');
      return ipcRenderer.invoke('updater-check-for-updates');
    },

    /**
     * Baixa atualização usando electron-updater
     * @returns {Promise<Object>} Resultado do download
     */
    downloadUpdate: () => {
      console.log('📤 IPC: updater-download-update');
      return ipcRenderer.invoke('updater-download-update');
    },

    /**
     * Instala atualização e reinicia app
     * @returns {Promise<Object>} Resultado da instalação
     */
    quitAndInstall: () => {
      console.log('📤 IPC: updater-quit-and-install');
      return ipcRenderer.invoke('updater-quit-and-install');
    },

    /**
     * Obtém informações de versão do app
     * @returns {Promise<Object>} Informações de versão
     */
    getVersion: () => {
      console.log('📤 IPC: updater-get-version');
      return ipcRenderer.invoke('updater-get-version');
    }
  });
  console.log('✅ API Electron (IPC) exposta com sucesso');
  console.log('✅ APIs do popup de uso contínuo expostas com sucesso');
  console.log('🔄 ✅ APIs de update seguro expostas com sucesso');

  // Configurações estáticas
  contextBridge.exposeInMainWorld('APP_CONFIG', {
    VERSION: '1.10.0',
    CACHE_ENABLED: true,
    CONNECTION_MODE: 'IPC',
    POPUP_USO_CONTINUO_ENABLED: true,
    UPDATE_SYSTEM_ENABLED: true // Nova configuração
  });
  console.log('✅ Configurações expostas com sucesso');

  console.log('🎉 Todas as APIs IPC foram expostas com sucesso!');
  console.log('🔄 Sistema de update seguro pronto para uso!');

} catch (error) {
  console.error('❌ ERRO CRÍTICO ao expor APIs IPC:', error);
  console.error('Stack:', error.stack);
}

console.log('✅ Preload.js (IPC + Update) carregado com sucesso!');