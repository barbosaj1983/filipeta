const { contextBridge, ipcRenderer } = require('electron');

// Cache em memória para o popup (mesmo padrão da filipeta principal)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos (igual ao principal)

// Função para verificar se cache é válido
function isCacheValid(key) {
    const cached = cache.get(key);
    if (!cached) return false;
    
    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
        cache.delete(key); // Remove cache expirado
        return false;
    }
    return true;
}

// Função para obter do cache
function getFromCache(key) {
    if (!isCacheValid(key)) return null;
    const cached = cache.get(key);
    console.log(`📦 Cache HIT: ${key}`);
    return cached.data;
}

// Função para salvar no cache
function saveToCache(key, data, ttl = CACHE_TTL) {
    cache.set(key, {
        data: data,
        timestamp: Date.now(),
        ttl: ttl
    });
    console.log(`💾 Cache SAVE: ${key} (TTL: ${ttl}ms)`);
}

// Wrapper para chamadas com cache
async function withCache(cacheKey, ipcChannel, ...args) {
    // Tentar cache primeiro
    const cached = getFromCache(cacheKey);
    if (cached !== null) {
        return cached;
    }
    
    // Cache miss - buscar via IPC
    console.log(`🔍 Cache MISS: ${cacheKey} - buscando via IPC`);
    const data = await ipcRenderer.invoke(ipcChannel, ...args);
    
    // Salvar no cache
    saveToCache(cacheKey, data);
    return data;
}

// Exposição das APIs para o popup de uso contínuo COM CACHE
contextBridge.exposeInMainWorld('electronAPI', {
    // Função para buscar dados do cliente (COM CACHE)
    buscarClientePorCpf: async (cpf) => {
        const cacheKey = `cliente_${cpf}`;
        return await withCache(cacheKey, 'db-buscar-cliente-cpf', cpf);
    },
    
    // Função para buscar produtos de uso contínuo (COM CACHE)
    buscarProdutosUsoContinuo: async (cpf) => {
        const cacheKey = `uso_continuo_${cpf}`;
        return await withCache(cacheKey, 'buscar-produtos-uso-continuo', cpf);
    },
    
    // Função para fechar o popup
    fecharPopupUsoContinuo: () => ipcRenderer.invoke('fechar-popup-uso-continuo'),
    
    // Listener para receber o CPF e inicializar o popup
    onInicializarPopup: (callback) => {
        ipcRenderer.on('inicializar-popup-uso-continuo', (event, cpf) => {
            callback(cpf);
        });
    },
    
    // NOVAS FUNÇÕES DE CACHE (para debug/controle)
    limparCachePopup: () => {
        const size = cache.size;
        cache.clear();
        console.log(`🗑️ Cache popup limpo (${size} itens removidos)`);
        return { cleared: size };
    },
    
    getCacheStatsPopup: () => {
        const stats = {
            size: cache.size,
            keys: Array.from(cache.keys()),
            totalMemory: JSON.stringify([...cache]).length
        };
        console.log('📊 Cache popup stats:', stats);
        return stats;
    }
});

// Log de inicialização
console.log('🚀 Preload-popup.js carregado COM CACHE (TTL: 5min)');
console.log('📦 Sistema de cache do popup inicializado');