// main.js - VERSÃO FINAL COM SISTEMA DE UPDATE FORÇADO E NOMES CORRETOS
const { app, BrowserWindow, globalShortcut, shell, ipcMain } = require('electron');
const path = require('path');
const AutoLaunch = require('auto-launch');
const { autoUpdater } = require('electron-updater');

// Informações de versão
const APP_VERSION = '1.10.0';
const BUILD_DATE = '2025-09-01';

let mainWindow;

// ========================================
// CONFIGURAÇÃO DO ELECTRON-UPDATER
// ========================================

function setupAutoUpdater() {
  console.log('🔄 Configurando electron-updater...');
  
  // Configurações do updater
  autoUpdater.autoDownload = false; // Não baixa automaticamente
  autoUpdater.autoInstallOnAppQuit = true; // Instala ao fechar o app
  
  // Eventos do updater
  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 Verificando atualizações...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('✅ Atualização disponível:', info.version);
    console.log('📅 Data de lançamento:', info.releaseDate);
    
    // Enviar notificação para o renderer se necessário
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('ℹ️ Nenhuma atualização disponível. Versão atual:', info.version);
  });

  autoUpdater.on('error', (err) => {
    console.error('❌ Erro no updater:', err.message);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    console.log(`📥 Download: ${percent}% (${progressObj.transferred}/${progressObj.total} bytes)`);
    
    // Enviar progresso para o renderer se necessário
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ Atualização baixada com sucesso:', info.version);
    console.log('🔄 A atualização será instalada na próxima inicialização');
    
    // Enviar notificação para o renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
        message: 'Atualização pronta para instalação'
      });
    }
  });

  // Verificar atualizações na inicialização (aguardar 10 segundos)
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 10000);

  // Verificar atualizações periodicamente (a cada 4 horas)
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 4 * 60 * 60 * 1000);
}

// ========================================
// SINGLE INSTANCE LOCK - IMPEDE MÚLTIPLAS INSTÂNCIAS
// ========================================

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('🚫 Outra instância já está rodando, encerrando esta...');
  app.quit();
  process.exit(0);
} else {
  console.log('✅ Single instance lock obtido');
  
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Alguém tentou rodar uma segunda instância, focar a janela existente
    console.log('🔄 Segunda instância detectada, focando janela principal');
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
      mainWindow.show();
    }
  });
}

// ========================================
// VARIÁVEIS DE CONTROLE DO POPUP
// ========================================
let popupUsoContinuoWindow = null;
let popupCriandoAtualmente = false;
let ultimoCpfPopup = null;

// LOG DE CONTROLE PARA DEBUG
let popupOpenHistory = [];

function logPopupOpen(source, cpf, details = '') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, source, cpf, details };
    popupOpenHistory.push(logEntry);
    
    if (popupOpenHistory.length > 10) {
        popupOpenHistory.shift();
    }
    
    console.log(`🟡 POPUP OPEN LOG: ${source} | CPF: ${cpf} | ${details}`);
}

// ========================================
// VERIFICAR MODO DE INICIALIZAÇÃO
// ========================================

function checkStartupMode() {
  const isStartup = process.argv.includes('--startup');
  const isUserLaunched = !isStartup;
  
  if (isStartup) {
    console.log('🟡 Aplicação iniciada pelo Windows (auto-startup)');
  } else {
    console.log('🟢 Aplicação iniciada manualmente pelo usuário');
  }
  
  return { isStartup, isUserLaunched };
}

console.log('🚀 Main process iniciando...');

// Verificar modo de inicialização
const startupMode = checkStartupMode();

// =============================
// CONFIGURAÇÃO DO BANCO DE DADOS
// =============================

const CONFIG = {
  NEON_DATABASE_URL_RO: "postgresql://neondb_owner:npg_gklSFwe4A9NJ@ep-dry-morning-ac01g05z-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
};

const onlyDigits = (s = '') => String(s).replace(/\D/g, '');

// Cache inteligente com TTL
class SmartCache {
  constructor(maxSize = 1000, defaultTTL = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    console.log(`📦 Cache inicializado: ${maxSize} itens, TTL ${defaultTTL}ms`);
  }

  set(key, value, ttl = this.defaultTTL) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.cache.clear();
    console.log('🗑️ Cache limpo');
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

const cache = new SmartCache(2000, 10 * 60 * 1000);

// =============================
// CONEXÃO NEON NO MAIN PROCESS
// =============================

let _sqlClient = null;

async function getNeonClient() {
  if (_sqlClient) return _sqlClient;

  try {
    console.log('🔗 Conectando ao Neon no main process...');
    
    const { neon } = require('@neondatabase/serverless');
    const connectionString = CONFIG.NEON_DATABASE_URL_RO;
    
    if (!connectionString) {
      throw new Error('String de conexão Neon não encontrada');
    }

    _sqlClient = neon(connectionString);
    
    const testResult = await _sqlClient`SELECT 1 as test`;
    console.log('🧪 Teste resultado:', testResult[0]);
    console.log('✅ Conectado ao Neon no main process');
    
    return _sqlClient;
  } catch (error) {
    console.error('❌ Erro ao conectar no Neon (main):', error);
    return null;
  }
}

// ========================================
// FUNÇÕES DE BANCO - MESMO CÓDIGO ANTERIOR
// ========================================

async function buscarClientePorCpfMain(cpf) {
  const cpfLimpo = onlyDigits(cpf);
  if (!cpfLimpo) return { found: false, nome: null };

  const cacheKey = `cliente:${cpfLimpo}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const client = await getNeonClient();
    if (!client) return { found: false, nome: null };

    console.log(`🔍 Buscando cliente para CPF: ${cpfLimpo}`);

    const result = await client`
      SELECT 
        nome,
        datahorafechamento
      FROM recomendado_cliente 
      WHERE REGEXP_REPLACE(cpf, '\\D', '', 'g') = ${cpfLimpo}
      ORDER BY datahorafechamento DESC NULLS LAST 
      LIMIT 1`;
    
    const response = result[0]?.nome ? 
      { found: true, nome: result[0].nome } : 
      { found: false, nome: null };

    console.log(`📊 Cliente: ${response.found ? response.nome : 'Não encontrado'}`);
    cache.set(cacheKey, response);
    
    return response;
  } catch (error) {
    console.error('❌ Erro buscar cliente (main):', error);
    return { found: false, nome: null };
  }
}

async function buscarRecomendacoesCpfMain(cpf, limit = 6) {
  const cpfLimpo = onlyDigits(cpf);
  if (!cpfLimpo) return [];

  const cacheKey = `rec:${cpfLimpo}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const client = await getNeonClient();
    if (!client) return [];

    console.log(`🔍 Buscando recomendações para CPF: ${cpfLimpo}`);

    const result = await client`
      SELECT DISTINCT
        REGEXP_REPLACE(codigobarras, '\\D', '', 'g') AS ean,
        COALESCE(NULLIF(TRIM(descricao), ''), 'Produto sem descrição') AS nome,
        datahorafechamento
      FROM recomendado_cliente 
      WHERE REGEXP_REPLACE(cpf, '\\D', '', 'g') = ${cpfLimpo}
        AND codigobarras IS NOT NULL
        AND TRIM(codigobarras) != ''
      ORDER BY datahorafechamento DESC NULLS LAST
      LIMIT ${limit}`;

    console.log(`📊 Recomendações encontradas: ${result.length}`);

    const cleanResult = result.map(item => ({
      ean: item.ean,
      nome: item.nome
    }));

    cache.set(cacheKey, cleanResult);
    return cleanResult;
  } catch (error) {
    console.error('❌ Erro buscar recomendações (main):', error);
    return [];
  }
}

async function buscarMaisConsumidosMain(cpf, limit = 6) {
  const cpfLimpo = onlyDigits(cpf);
  if (!cpfLimpo) return [];

  const cacheKey = `top:${cpfLimpo}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const client = await getNeonClient();
    if (!client) return [];

    console.log(`🔍 Buscando mais consumidos para CPF: ${cpfLimpo}`);

    const result = await client`
      SELECT DISTINCT
        REGEXP_REPLACE(codigobarras, '\\D', '', 'g') AS ean,
        COALESCE(NULLIF(TRIM(descricao), ''), 'Produto sem descrição') AS nome,
        total_de_compras,
        ranking
      FROM produtos_mais_consumidos 
      WHERE REGEXP_REPLACE(cpf, '\\D', '', 'g') = ${cpfLimpo}
        AND codigobarras IS NOT NULL
        AND TRIM(codigobarras) != ''
      ORDER BY total_de_compras DESC, ranking ASC 
      LIMIT ${limit}`;

    console.log(`📊 Mais consumidos encontrados: ${result.length}`);

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('❌ Erro buscar mais consumidos (main):', error);
    return [];
  }
}

async function buscarProdutoPorEanMain(ean) {
  const eanLimpo = onlyDigits(ean);
  if (!eanLimpo) return { ean: eanLimpo, nome: null, origem: 'ean_invalido' };

  const cacheKey = `produto:${eanLimpo}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const client = await getNeonClient();
    if (!client) return { ean: eanLimpo, nome: 'Sem conexão', origem: 'erro' };

    console.log(`🔍 Buscando produto para EAN: ${eanLimpo}`);

    const result = await client`
      SELECT 
        descricao AS nome, 
        'recomendado_cliente' AS origem,
        datahorafechamento
      FROM recomendado_cliente 
      WHERE REGEXP_REPLACE(codigobarras, '\\D', '', 'g') = ${eanLimpo}
        AND NULLIF(TRIM(descricao), '') IS NOT NULL
      ORDER BY datahorafechamento DESC NULLS LAST 
      LIMIT 1`;
    
    const produto = result[0]?.nome ? 
      { ean: eanLimpo, nome: result[0].nome, origem: result[0].origem } :
      { ean: eanLimpo, nome: 'Produto sem descrição', origem: 'nao_encontrado' };

    console.log(`📊 Produto encontrado: ${produto.nome} (${produto.origem})`);

    cache.set(cacheKey, produto);
    return produto;
  } catch (error) {
    console.error('❌ Erro buscar produto (main):', error);
    return { ean: eanLimpo, nome: 'Erro na consulta', origem: 'erro' };
  }
}

async function buscarVendidosJuntosMain(ean, limit = 6) {
  const eanLimpo = onlyDigits(ean);
  if (!eanLimpo) return [];

  const cacheKey = `vendidos:${eanLimpo}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const client = await getNeonClient();
    if (!client) return [];

    console.log(`🔍 Buscando vendidos juntos para EAN: ${eanLimpo}`);

    const result = await client`
      WITH relacionamentos_bidirecionais AS (
        SELECT 
          REGEXP_REPLACE(relacionado_ean, '\\D', '', 'g') AS ean_relacionado,
          relacionado_nome AS nome_relacionado,
          COALESCE(CAST(lift AS DECIMAL), 0.0) as lift,
          COALESCE(CAST(confidence AS DECIMAL), 0.0) as confidence
        FROM produto_relacionado 
        WHERE REGEXP_REPLACE(produto_ean, '\\D', '', 'g') = ${eanLimpo}
          AND relacionado_ean IS NOT NULL
          AND REGEXP_REPLACE(relacionado_ean, '\\D', '', 'g') != ${eanLimpo}
          AND REGEXP_REPLACE(relacionado_ean, '\\D', '', 'g') != ''
        
        UNION
        
        SELECT 
          REGEXP_REPLACE(produto_ean, '\\D', '', 'g') AS ean_relacionado,
          produto_nome AS nome_relacionado,
          COALESCE(CAST(lift AS DECIMAL), 0.0) as lift,
          COALESCE(CAST(confidence AS DECIMAL), 0.0) as confidence
        FROM produto_relacionado 
        WHERE REGEXP_REPLACE(relacionado_ean, '\\D', '', 'g') = ${eanLimpo}
          AND produto_ean IS NOT NULL
          AND REGEXP_REPLACE(produto_ean, '\\D', '', 'g') != ${eanLimpo}
          AND REGEXP_REPLACE(produto_ean, '\\D', '', 'g') != ''
      ),
      melhor_por_ean AS (
        SELECT DISTINCT ON (ean_relacionado)
          ean_relacionado,
          nome_relacionado,
          lift,
          confidence
        FROM relacionamentos_bidirecionais
        ORDER BY 
          ean_relacionado,
          lift DESC NULLS LAST, 
          confidence DESC NULLS LAST
      )
      SELECT
        ean_relacionado AS ean,
        COALESCE(NULLIF(TRIM(nome_relacionado), ''), 'Produto sem descrição') AS nome,
        lift,
        confidence
      FROM melhor_por_ean
      ORDER BY lift DESC NULLS LAST, confidence DESC NULLS LAST
      LIMIT ${limit}
    `;

    console.log(`📊 Vendidos juntos encontrados: ${result.length}`);

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('❌ Erro buscar vendidos juntos (main):', error);
    return [];
  }
}

async function buscarProdutosUsoContinuoDb(cpf) {
    const cpfLimpo = onlyDigits(cpf);
    if (!cpfLimpo) return [];

    const cacheKey = `uso_continuo:${cpfLimpo}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const client = await getNeonClient();
        if (!client) return [];

        console.log(`🔍 Buscando produtos de uso contínuo para CPF: ${cpfLimpo}`);

        const result = await client`
            SELECT 
                barras,
                produto,
                dias_sem_compras
            FROM dias_sem_compras_uso_continuo 
            WHERE REGEXP_REPLACE(cpf, '\\D', '', 'g') = ${cpfLimpo}
            ORDER BY dias_sem_compras ASC
            LIMIT 10
        `;

        console.log(`📊 Produtos uso contínuo encontrados: ${result.length}`);

        const cleanResult = result.map(row => ({
            ean: row.barras || '',
            nome: row.produto || 'Produto sem descrição',
            dias_sem_compras: row.dias_sem_compras || 0
        }));

        cache.set(cacheKey, cleanResult);
        return cleanResult;

    } catch (error) {
        console.error('❌ Erro ao buscar produtos de uso contínuo:', error);
        return [];
    }
}

async function criarPopupUsoContinuo(cpf, source = 'unknown') {
    const cpfLimpo = onlyDigits(cpf);
    
    logPopupOpen(source, cpfLimpo, 'Tentativa de criar popup');
    console.log(`🟡 Tentativa de criar popup para CPF: ${cpfLimpo} | Origem: ${source}`);
    
    if (popupCriandoAtualmente) {
        console.log('⚠️ Popup já está sendo criado, ignorando');
        logPopupOpen(source, cpfLimpo, 'Ignorado - já criando');
        return null;
    }
    
    if (popupUsoContinuoWindow && !popupUsoContinuoWindow.isDestroyed() && ultimoCpfPopup === cpfLimpo) {
        console.log('🔄 Popup já existe para este CPF, apenas focando');
        popupUsoContinuoWindow.focus();
        popupUsoContinuoWindow.show();
        logPopupOpen(source, cpfLimpo, 'Reusado - apenas foco');
        return popupUsoContinuoWindow;
    }
    
    if (popupUsoContinuoWindow && !popupUsoContinuoWindow.isDestroyed()) {
        console.log('🗑️ Fechando popup anterior');
        popupUsoContinuoWindow.destroy();
        popupUsoContinuoWindow = null;
    }

    try {
        popupCriandoAtualmente = true;
        ultimoCpfPopup = cpfLimpo;

        const produtosUsoContinuo = await buscarProdutosUsoContinuoDb(cpfLimpo);
        
        if (!produtosUsoContinuo || produtosUsoContinuo.length === 0) {
            console.log(`ℹ️ Nenhum produto de uso contínuo para CPF: ${cpfLimpo}`);
            popupCriandoAtualmente = false;
            ultimoCpfPopup = null;
            logPopupOpen(source, cpfLimpo, 'Cancelado - sem dados');
            return null;
        }

        console.log(`🟢 Criando popup para CPF: ${cpfLimpo} (${produtosUsoContinuo.length} produtos)`);
        logPopupOpen(source, cpfLimpo, `Criando popup - ${produtosUsoContinuo.length} produtos`);

        const popupConfig = {
            width: 500,
            height: 700,
            resizable: false,
            minimizable: false,
            maximizable: false,
            alwaysOnTop: true,
            skipTaskbar: false,
            frame: false,
            show: false,
            title: `Uso Contínuo - ${cpfLimpo}`,
            webPreferences: {
                preload: path.join(__dirname, 'preload-popup.js'),
                contextIsolation: true,
                enableRemoteModule: false,
                nodeIntegration: false,
                webSecurity: true
            }
        };

        popupUsoContinuoWindow = new BrowserWindow(popupConfig);
        await popupUsoContinuoWindow.loadFile('popup.html');

        popupUsoContinuoWindow.once('ready-to-show', () => {
            console.log('✅ Popup pronto para mostrar');
            
            const { screen } = require('electron');
            const primaryDisplay = screen.getPrimaryDisplay();
            const { height: screenHeight } = primaryDisplay.workAreaSize;
            const x = 50;
            const y = Math.floor((screenHeight - popupConfig.height) / 2);
            popupUsoContinuoWindow.setPosition(x, y);
            
            popupUsoContinuoWindow.show();
            popupUsoContinuoWindow.webContents.send('inicializar-popup-uso-continuo', cpfLimpo);
            
            popupCriandoAtualmente = false;
            
            console.log('✅ Popup mostrado com sucesso');
            logPopupOpen(source, cpfLimpo, 'Popup mostrado com sucesso');
        });

        popupUsoContinuoWindow.on('closed', () => {
            console.log('🗑️ Popup fechado definitivamente');
            popupUsoContinuoWindow = null;
            popupCriandoAtualmente = false;
            ultimoCpfPopup = null;
        });

        setTimeout(() => {
            if (popupUsoContinuoWindow && !popupUsoContinuoWindow.isDestroyed()) {
                console.log('⏰ Auto-fechamento do popup (3min)');
                popupUsoContinuoWindow.close();
            }
        }, 180000);

        return popupUsoContinuoWindow;

    } catch (error) {
        console.error('❌ Erro ao criar popup:', error);
        popupCriandoAtualmente = false;
        popupUsoContinuoWindow = null;
        ultimoCpfPopup = null;
        logPopupOpen(source, cpfLimpo, `Erro: ${error.message}`);
        return null;
    }
}

async function testarConexaoMain() {
  try {
    const client = await getNeonClient();
    if (!client) {
      return { success: false, message: 'Cliente Neon não disponível' };
    }
    
    const result = await client`SELECT 1 as test, NOW() as timestamp`;
    
    if (result[0]) {
      return { success: true, message: 'Conexão OK', data: result[0] };
    } else {
      return { success: false, message: 'Sem dados retornados' };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// =============================
// CONFIGURAÇÃO DE SEGURANÇA
// =============================

function preventCloseShortcuts() {
  globalShortcut.register('Alt+F4', () => {
    console.log('🚫 Alt+F4 bloqueado');
  });
  globalShortcut.register('CommandOrControl+W', () => {
    console.log('🚫 Ctrl+W bloqueado');
  });
  globalShortcut.register('CommandOrControl+Q', () => {
    console.log('🚫 Ctrl+Q bloqueado');
  });
  globalShortcut.register('CommandOrControl+R', () => {
    console.log('🚫 Ctrl+R bloqueado');
  });
  globalShortcut.register('F5', () => {
    console.log('🚫 F5 bloqueado');
  });
}

// =============================
// CRIAÇÃO DA JANELA PRINCIPAL
// =============================

function createMainWindow() {
  const { screen } = require('electron');
  const display = screen.getPrimaryDisplay();
  const { height } = display.workAreaSize;

  console.log('🖼️ Criando janela principal...');

  mainWindow = new BrowserWindow({
    width: 380,
    height: height,
    x: 0,
    y: 0,
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    skipTaskbar: false,
    transparent: false,
    focusable: true,
    minimizable: true,
    closable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      webSecurity: true
    }
  });

  mainWindow.loadFile('index.html');

  console.log(`🚀 Filipeta ${APP_VERSION} iniciado`);
  console.log(`📅 Build: ${BUILD_DATE}`);
  console.log(`📏 Dimensões: 380x${height}px`);

  // Eventos da janela
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    event.preventDefault();
    console.log('🚫 Navegação bloqueada:', navigationUrl);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.minimize();
    console.log('📽 Janela minimizada (tentativa de fechar interceptada)');
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isAltF4 = input.key === 'F4' && input.alt;
    const isCtrlW = input.key.toLowerCase() === 'w' && input.control;
    const isCtrlQ = input.key.toLowerCase() === 'q' && input.control;
    const isCtrlR = input.key.toLowerCase() === 'r' && input.control;
    const isF5 = input.key === 'F5';

    if (isAltF4 || isCtrlW || isCtrlQ || isCtrlR || isF5) {
      event.preventDefault();
      console.log('🚫 Atalho bloqueado:', input.key);
    }
  });

  mainWindow.on('minimize', () => {
    console.log('📽 Janela minimizada');
  });

  mainWindow.on('restore', () => {
    console.log('📼 Janela restaurada');
  });

  mainWindow.webContents.once('did-finish-load', () => {
    console.log('✅ Renderer carregado e pronto');
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 2) {
      console.log(`🖥️ Renderer [${level}]:`, message);
    }
  });
}

// =============================
// CONFIGURAÇÃO DE AUTO-INICIALIZAÇÃO CORRIGIDA
// =============================

function setupAutoLaunch() {
  try {
    if (process.platform === 'win32') {
      // APENAS uma configuração para Windows
      app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: false,
        path: app.getPath('exe'),
        args: ['--startup'] // Flag para identificar inicialização pelo Windows
      });
      console.log('✅ Auto-inicialização configurada para Windows');
    } else {
      // Para outras plataformas, usar AutoLaunch
      const autoLauncher = new AutoLaunch({
        name: 'Filipeta Assistente',
        path: app.getPath('exe'),
        isHidden: false
      });

      autoLauncher.isEnabled().then((isEnabled) => {
        if (!isEnabled) {
          return autoLauncher.enable();
        }
      }).then(() => {
        console.log('✅ Auto-inicialização configurada (AutoLaunch)');
      }).catch((err) => {
        console.warn('⚠️ Erro ao configurar auto-inicialização:', err.message);
      });
    }
  } catch (error) {
    console.warn('⚠️ Erro na configuração de auto-inicialização:', error.message);
  }
}

// =============================
// HANDLERS IPC - BANCO DE DADOS
// =============================

ipcMain.handle('db-buscar-cliente-cpf', async (event, cpf) => {
  console.log('📨 IPC: db-buscar-cliente-cpf', cpf);
  return await buscarClientePorCpfMain(cpf);
});

ipcMain.handle('db-buscar-recomendacoes-cpf', async (event, cpf, limit) => {
  console.log('📨 IPC: db-buscar-recomendacoes-cpf', cpf, limit);
  return await buscarRecomendacoesCpfMain(cpf, limit);
});

ipcMain.handle('db-buscar-mais-consumidos', async (event, cpf, limit) => {
  console.log('📨 IPC: db-buscar-mais-consumidos', cpf, limit);
  return await buscarMaisConsumidosMain(cpf, limit);
});

ipcMain.handle('db-buscar-produto-ean', async (event, ean) => {
  console.log('📨 IPC: db-buscar-produto-ean', ean);
  return await buscarProdutoPorEanMain(ean);
});

ipcMain.handle('db-buscar-vendidos-juntos', async (event, ean, limit) => {
  console.log('📨 IPC: db-buscar-vendidos-juntos', ean, limit);
  return await buscarVendidosJuntosMain(ean, limit);
});

ipcMain.handle('db-testar-conexao', async (event) => {
  console.log('📨 IPC: db-testar-conexao');
  return await testarConexaoMain();
});

ipcMain.handle('db-limpar-cache', async (event) => {
  console.log('📨 IPC: db-limpar-cache');
  cache.clear();
  return { success: true };
});

ipcMain.handle('db-cache-stats', async (event) => {
  console.log('📨 IPC: db-cache-stats');
  return cache.getStats();
});

// ========================================
// HANDLERS IPC PARA O POPUP
// ========================================

ipcMain.handle('buscar-produtos-uso-continuo', async (event, cpf) => {
    console.log('📨 IPC: buscar-produtos-uso-continuo', cpf);
    try {
        return await buscarProdutosUsoContinuoDb(cpf);
    } catch (error) {
        console.error('❌ Erro no handler buscar-produtos-uso-continuo:', error);
        return [];
    }
});

ipcMain.handle('abrir-popup-uso-continuo', async (event, cpf) => {
    console.log('📨 IPC: abrir-popup-uso-continuo', cpf);
    console.log('🔍 RASTREAMENTO: Popup solicitado via IPC manual');
    
    try {
        const popup = await criarPopupUsoContinuo(cpf, 'IPC_MANUAL');
        return { 
            success: popup !== null,
            message: popup ? 'Popup criado com sucesso' : 'Sem dados de uso contínuo ou popup já existe'
        };
    } catch (error) {
        console.error('❌ Erro no handler abrir-popup:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-popup-history', async (event) => {
    console.log('📨 IPC: get-popup-history');
    return {
        history: popupOpenHistory,
        currentState: {
            popupExists: popupUsoContinuoWindow !== null,
            isDestroyed: popupUsoContinuoWindow ? popupUsoContinuoWindow.isDestroyed() : true,
            isCreating: popupCriandoAtualmente,
            lastCpf: ultimoCpfPopup
        }
    };
});

ipcMain.handle('fechar-popup-uso-continuo', async () => {
    console.log('📨 IPC: fechar-popup-uso-continuo');
    try {
        if (popupUsoContinuoWindow && !popupUsoContinuoWindow.isDestroyed()) {
            popupUsoContinuoWindow.close();
            console.log('✅ Popup fechado via IPC');
            return { success: true };
        } else {
            console.log('⚠️ Popup não existe ou já foi fechado');
            return { success: false, error: 'Popup não encontrado' };
        }
    } catch (error) {
        console.error('❌ Erro ao fechar popup via IPC:', error);
        return { success: false, error: error.message };
    }
});

// ========================================
// HANDLERS IPC PARA ELECTRON-UPDATER
// ========================================

ipcMain.handle('updater-check-for-updates', async () => {
    console.log('📨 IPC: updater-check-for-updates');
    try {
        const result = await autoUpdater.checkForUpdatesAndNotify();
        return { success: true, result };
    } catch (error) {
        console.error('❌ Erro ao verificar atualizações:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('updater-download-update', async () => {
    console.log('📨 IPC: updater-download-update');
    try {
        await autoUpdater.downloadUpdate();
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao baixar atualização:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('updater-quit-and-install', async () => {
    console.log('📨 IPC: updater-quit-and-install');
    try {
        autoUpdater.quitAndInstall();
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao instalar atualização:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('updater-get-version', async () => {
    console.log('📨 IPC: updater-get-version');
    return {
        currentVersion: app.getVersion(),
        appVersion: APP_VERSION,
        buildDate: BUILD_DATE
    };
});

// ========================================
// SISTEMA DE UPDATE FORÇADO COM NOMES CORRETOS - VERSÃO FINAL
// ========================================

ipcMain.handle('downloadAndInstallUpdate', async (event, updateInfo) => {
    console.log('📨 IPC: downloadAndInstallUpdate - MODO FORÇADO', updateInfo);
    
    const https = require('https');
    const fs = require('fs');
    const os = require('os');
    const { spawn, exec } = require('child_process');
    const crypto = require('crypto');
    
    // Gerar pasta temporária única
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(4).toString('hex');
    const tempDir = path.join(os.tmpdir(), `filipeta-update-${timestamp}-${randomId}`);
    const tempFilePath = path.join(tempDir, updateInfo.filename);
    
    try {
        console.log('🚀 INICIANDO ATUALIZAÇÃO FORÇADA...');
        console.log(`📁 Pasta temporária: ${tempDir}`);
        
        // Criar pasta temporária com permissões máximas
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true, mode: 0o777 });
            console.log('✅ Pasta temporária criada com permissões máximas');
        }
        
        // Função de download com redirect automático
        const downloadFile = async (url, maxRedirects = 10) => {
            return new Promise((resolve, reject) => {
                if (maxRedirects === 0) {
                    reject(new Error('Limite de redirects excedido'));
                    return;
                }
                
                console.log(`📡 Baixando: ${url}`);
                
                const request = https.get(url, (response) => {
                    const { statusCode, headers } = response;
                    console.log(`📊 Status HTTP: ${statusCode}`);
                    
                    // Seguir redirects automaticamente
                    if (statusCode >= 300 && statusCode < 400 && headers.location) {
                        console.log(`🔄 Redirect: ${headers.location}`);
                        response.resume();
                        downloadFile(headers.location, maxRedirects - 1)
                            .then(resolve)
                            .catch(reject);
                        return;
                    }
                    
                    if (statusCode !== 200) {
                        response.resume();
                        reject(new Error(`HTTP ${statusCode}: ${response.statusMessage}`));
                        return;
                    }
                    
                    // Criar arquivo com permissões máximas
                    let file;
                    try {
                        file = fs.createWriteStream(tempFilePath, { 
                            flags: 'w', 
                            mode: 0o777 
                        });
                    } catch (fsError) {
                        response.resume();
                        reject(new Error(`Erro ao criar arquivo: ${fsError.message}`));
                        return;
                    }
                    
                    let downloadedBytes = 0;
                    const totalBytes = parseInt(headers['content-length']) || 0;
                    
                    response.on('data', (chunk) => {
                        downloadedBytes += chunk.length;
                        if (totalBytes > 0) {
                            const progress = Math.round((downloadedBytes / totalBytes) * 100);
                            if (progress % 20 === 0) {
                                console.log(`📥 Download: ${progress}% (${downloadedBytes}/${totalBytes} bytes)`);
                            }
                        }
                    });
                    
                    response.pipe(file);
                    
                    file.on('finish', () => {
                        file.close();
                        console.log(`✅ Download concluído: ${downloadedBytes} bytes`);
                        resolve(downloadedBytes);
                    });
                    
                    file.on('error', (err) => {
                        console.error('❌ Erro no arquivo:', err);
                        try {
                            file.close();
                            if (fs.existsSync(tempFilePath)) {
                                fs.unlinkSync(tempFilePath);
                            }
                        } catch (e) { /* ignore */ }
                        reject(err);
                    });
                    
                }).on('error', (err) => {
                    console.error('❌ Erro HTTPS:', err);
                    reject(err);
                });
                
                // Timeout mais longo para downloads grandes
                request.setTimeout(60000, () => {
                    request.destroy();
                    reject(new Error('Timeout no download'));
                });
            });
        };
        
        // Executar download
        const downloadedBytes = await downloadFile(updateInfo.url);
        
        // Validar arquivo baixado
        if (!fs.existsSync(tempFilePath)) {
            throw new Error('Arquivo não foi criado');
        }
        
        const fileStats = fs.statSync(tempFilePath);
        console.log(`📊 Arquivo final: ${fileStats.size} bytes`);
        
        if (fileStats.size < 1024 * 1024) { // Menor que 1MB é muito suspeito
            throw new Error(`Arquivo muito pequeno: ${fileStats.size} bytes`);
        }
        
        console.log('🔥 INICIANDO INSTALAÇÃO FORÇADA...');
        
        // ========================================
        // SCRIPT BATCH CORRIGIDO COM NOMES CORRETOS
        // ========================================
        
        // Criar script batch para instalação forçada
        const batchScript = path.join(tempDir, 'install_force.bat');
        const batchContent = `@echo off
chcp 65001 > nul
echo FILIPETA FORCE UPDATE INSTALLER
echo ================================

echo Aguardando 3 segundos...
timeout /t 3 /nobreak > nul

echo Matando processos Filipeta...
taskkill /f /im "Filipeta*.exe" > nul 2>&1
taskkill /f /im "*Filipeta*" > nul 2>&1
taskkill /f /im "*filipeta*" > nul 2>&1
taskkill /f /im "*Assistente*" > nul 2>&1

echo Aguardando limpeza de processos...
timeout /t 2 /nobreak > nul

echo ================================
echo EXECUTANDO INSTALADOR COM MONITOR
echo ================================
echo Instalador: ${updateInfo.filename}
echo Local: ${tempFilePath}
echo ================================

REM VERSÃO COM MONITOR VISÍVEL - Remove VERYSILENT
"${tempFilePath}" /SILENT /NORESTART /FORCECLOSEAPPLICATIONS /RESTARTAPPLICATIONS /SP-

echo ================================
echo INSTALAÇÃO CONCLUÍDA
echo ================================

echo Aguardando instalação completar...
timeout /t 5 /nobreak > nul

echo Procurando Filipeta instalado...

REM Tentar localizar o executável da aplicação em várias localizações possíveis
set "APP_FOUND=0"

REM Local 1: AppData Local Programs
if exist "%LOCALAPPDATA%\\Programs\\filipeta\\Filipeta Assistente de Balcão.exe" (
    echo ✅ Encontrado em AppData Local Programs
    start "" "%LOCALAPPDATA%\\Programs\\filipeta\\Filipeta Assistente de Balcão.exe"
    set "APP_FOUND=1"
    goto :APP_STARTED
)

REM Local 2: Program Files
if exist "%PROGRAMFILES%\\Filipeta Assistente de Balcão\\Filipeta Assistente de Balcão.exe" (
    echo ✅ Encontrado em Program Files
    start "" "%PROGRAMFILES%\\Filipeta Assistente de Balcão\\Filipeta Assistente de Balcão.exe"
    set "APP_FOUND=1"
    goto :APP_STARTED
)

REM Local 3: Program Files x86
if exist "%PROGRAMFILES(X86)%\\Filipeta Assistente de Balcão\\Filipeta Assistente de Balcão.exe" (
    echo ✅ Encontrado em Program Files x86
    start "" "%PROGRAMFILES(X86)%\\Filipeta Assistente de Balcão\\Filipeta Assistente de Balcão.exe"
    set "APP_FOUND=1"
    goto :APP_STARTED
)

REM Local 4: Busca por padrão alternativo 1
if exist "%LOCALAPPDATA%\\Programs\\filipeta\\filipeta.exe" (
    echo ✅ Encontrado como filipeta.exe
    start "" "%LOCALAPPDATA%\\Programs\\filipeta\\filipeta.exe"
    set "APP_FOUND=1"
    goto :APP_STARTED
)

REM Local 5: Busca por padrão alternativo 2
if exist "%PROGRAMFILES%\\Filipeta\\Filipeta.exe" (
    echo ✅ Encontrado como Filipeta.exe
    start "" "%PROGRAMFILES%\\Filipeta\\Filipeta.exe"
    set "APP_FOUND=1"
    goto :APP_STARTED
)

REM Local 6: Busca genérica com findstr
echo 🔍 Fazendo busca avançada por Filipeta...
for /f "delims=" %%i in ('dir /s /b "%LOCALAPPDATA%\\Programs\\*Filipeta*.exe" 2^>nul') do (
    echo ✅ Encontrado via busca: %%i
    start "" "%%i"
    set "APP_FOUND=1"
    goto :APP_STARTED
)

for /f "delims=" %%i in ('dir /s /b "%PROGRAMFILES%\\*Filipeta*.exe" 2^>nul') do (
    echo ✅ Encontrado via busca: %%i
    start "" "%%i"
    set "APP_FOUND=1"
    goto :APP_STARTED
)

:APP_STARTED
echo ================================
if "%APP_FOUND%"=="1" (
    echo ✅ FILIPETA REINICIADO COM SUCESSO!
    echo A aplicação foi atualizada e está sendo iniciada...
) else (
    echo ⚠️ FILIPETA NÃO ENCONTRADO AUTOMATICAMENTE
    echo Por favor, inicie manualmente ou reinicie o sistema
    echo Locais verificados:
    echo - %LOCALAPPDATA%\\Programs\\filipeta\\
    echo - %PROGRAMFILES%\\Filipeta Assistente de Balcão\\
    echo - %PROGRAMFILES(X86)%\\Filipeta Assistente de Balcão\\
)
echo ================================

echo 🧹 Limpando arquivos temporários...
timeout /t 3 /nobreak > nul

REM Limpeza agressiva de arquivos temporários
del /f /q "${tempFilePath}" > nul 2>&1
del /f /q "${batchScript}" > nul 2>&1
rmdir /s /q "${tempDir}" > nul 2>&1

echo ✅ Limpeza concluída!
echo ================================
echo 🎉 ATUALIZAÇÃO FORÇADA FINALIZADA
echo ================================
echo Você pode fechar esta janela.
timeout /t 5 /nobreak > nul
`;

        fs.writeFileSync(batchScript, batchContent, { encoding: 'utf8', mode: 0o777 });
        console.log('📝 Script de instalação forçada criado com busca inteligente');
        
        // 2. Preparar para instalação forçada
        console.log('⚡ MODO FORÇA BRUTA ATIVADO');
        
        // 3. Executar script de instalação forçada
        const batchProcess = spawn('cmd', ['/c', batchScript], {
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
            shell: true
        });
        
        batchProcess.unref();
        console.log(`🚀 Script de força bruta executado (PID: ${batchProcess.pid})`);
        
        // 4. Agendar fechamento do app atual
        setTimeout(() => {
            console.log('💀 FORÇANDO FECHAMENTO DO APP PARA INSTALAÇÃO...');
            
            // Tentar métodos progressivamente mais agressivos
            try {
                // Método 1: Fechar graciosamente
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.close();
                }
                
                setTimeout(() => {
                    // Método 2: Quit forçado
                    app.exit(0);
                }, 1000);
                
                setTimeout(() => {
                    // Método 3: Process kill (último recurso)
                    process.exit(0);
                }, 3000);
                
            } catch (error) {
                console.error('❌ Erro ao fechar app:', error);
                // Forçar saída mesmo com erro
                process.exit(0);
            }
        }, 2000);
        
        return { 
            success: true, 
            message: 'INSTALAÇÃO FORÇADA INICIADA - App será fechado automaticamente',
            fileSize: fileStats.size,
            mode: 'FORÇA_BRUTA',
            tempPath: tempFilePath,
            batchScript: batchScript
        };
        
    } catch (error) {
        console.error('❌ ERRO CRÍTICO NA INSTALAÇÃO FORÇADA:', error);
        
        // Limpeza de emergência mais agressiva
        try {
            // Tentar remover arquivos múltiplas vezes
            for (let i = 0; i < 3; i++) {
                try {
                    if (fs.existsSync(tempFilePath)) {
                        fs.chmodSync(tempFilePath, 0o777);
                        fs.unlinkSync(tempFilePath);
                    }
                    if (fs.existsSync(tempDir)) {
                        const files = fs.readdirSync(tempDir);
                        files.forEach(file => {
                            const filePath = path.join(tempDir, file);
                            try {
                                fs.chmodSync(filePath, 0o777);
                                fs.unlinkSync(filePath);
                            } catch (e) { /* ignore */ }
                        });
                        fs.rmdirSync(tempDir);
                    }
                    break; // Se chegou aqui, limpeza bem-sucedida
                } catch (cleanupErr) {
                    if (i === 2) { // Última tentativa
                        console.warn('⚠️ Limpeza de emergência falhou após 3 tentativas');
                    }
                }
            }
        } catch (finalError) {
            console.warn('⚠️ Limpeza final falhou:', finalError.message);
        }
        
        return { 
            success: false, 
            error: `FALHA NA INSTALAÇÃO FORÇADA: ${error.message}`,
            details: error.code || 'UNKNOWN_ERROR',
            mode: 'FORÇA_BRUTA_FALHOU'
        };
    }
});

// ========================================
// HANDLER ADICIONAL: FORCE RESTART
// Para casos extremos onde é necessário restart manual
// ========================================

ipcMain.handle('forceRestartApp', async () => {
    console.log('💀 FORCE RESTART SOLICITADO');
    
    try {
        // Método mais agressivo de restart
        const { spawn } = require('child_process');
        const appPath = app.getPath('exe');
        
        console.log(`🔄 Tentando reiniciar: ${appPath}`);
        
        // Spawn novo processo antes de matar o atual
        const newProcess = spawn(appPath, [], {
            detached: true,
            stdio: 'ignore'
        });
        
        newProcess.unref();
        
        // Aguardar um pouco e forçar saída
        setTimeout(() => {
            console.log('💀 FORÇANDO SAÍDA PARA RESTART...');
            process.exit(0);
        }, 1000);
        
        return { success: true, message: 'Restart forçado iniciado' };
        
    } catch (error) {
        console.error('❌ Erro no force restart:', error);
        
        // Se tudo falhar, pelo menos tentar fechar
        setTimeout(() => {
            process.exit(0);
        }, 500);
        
        return { success: false, error: error.message };
    }
});

// =============================
// HANDLERS IPC - JANELA
// =============================

ipcMain.handle('minimize-window', () => {
  console.log('📨 IPC: minimize-window recebido');
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
      console.log('✅ Janela minimizada via IPC');
      return { success: true };
    } else {
      console.error('❌ Janela não disponível para minimizar');
      return { success: false, error: 'Janela não disponível' };
    }
  } catch (error) {
    console.error('❌ Erro ao minimizar janela:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-app-info', () => {
  console.log('📨 IPC: get-app-info recebido');
  return {
    version: APP_VERSION,
    buildDate: BUILD_DATE,
    electron: process.versions.electron,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch
  };
});

ipcMain.handle('restore-window', () => {
  console.log('📨 IPC: restore-window recebido');
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
      console.log('✅ Janela restaurada via IPC');
      return { success: true };
    }
    return { success: false, error: 'Janela não disponível' };
  } catch (error) {
    console.error('❌ Erro ao restaurar janela:', error);
    return { success: false, error: error.message };
  }
});

// =============================
// ATALHOS GLOBAIS
// =============================

function setupGlobalShortcuts() {
  try {
    globalShortcut.register('CommandOrControl+Shift+F', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
        console.log('📼 Janela restaurada via atalho global');
      }
    });

    globalShortcut.register('CommandOrControl+Shift+M', () => {
      if (mainWindow) {
        mainWindow.minimize();
        console.log('📽 Janela minimizada via atalho global');
      }
    });

    console.log('⌨️ Atalhos globais configurados:');
    console.log('   Ctrl+Shift+F - Restaurar janela');
    console.log('   Ctrl+Shift+M - Minimizar janela');
  } catch (error) {
    console.warn('⚠️ Erro ao configurar atalhos globais:', error.message);
  }
}

// =============================
// EVENTOS DO APP
// =============================

app.whenReady().then(async () => {
  console.log('🚀 Electron pronto, iniciando aplicação...');
  
  preventCloseShortcuts();
  setupAutoLaunch();
  createMainWindow();
  setupGlobalShortcuts();
  
  // Configurar auto-updater APÓS tudo estar pronto
  setupAutoUpdater();
  
  console.log('🔗 Inicializando conexão com banco...');
  try {
    await getNeonClient();
    console.log('✅ Banco inicializado com sucesso');
  } catch (error) {
    console.warn('⚠️ Erro ao inicializar banco (não crítico):', error.message);
  }
  
  console.log('✅ Filipeta Assistente iniciado com sucesso');
  console.log('✅ Single instance lock ativo - apenas uma instância permitida');
  console.log('✅ Popup configurado para abertura APENAS manual');
  console.log('✅ Sistema de updates FORÇADO configurado para GitHub Releases');
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
  console.log('🚫 Tentativa de fechar todas as janelas bloqueada');
});

app.on('before-quit', (event) => {
  event.preventDefault();
  console.log('🚫 Tentativa de encerrar aplicação bloqueada');
});

// =============================
// TRATAMENTO DE ERROS
// =============================

process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada:', reason);
});

// =============================
// INFORMAÇÕES DE DEBUG
// =============================

console.log('📋 Informações do sistema:');
console.log(`   Versão: ${APP_VERSION}`);
console.log(`   Build: ${BUILD_DATE}`);
console.log(`   Electron: ${process.versions.electron}`);
console.log(`   Node: ${process.versions.node}`);
console.log(`   Plataforma: ${process.platform}`);
console.log(`   Arquitetura: ${process.arch}`);
console.log(`   Diretório: ${__dirname}`);

global.mainWindow = mainWindow;