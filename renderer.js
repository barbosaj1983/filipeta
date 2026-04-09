// renderer.js - VERSÃO CORRIGIDA COM POPUP USO CONTÍNUO + SISTEMA DE UPDATE
(function () {
  'use strict';

  console.log('🚀 Inicializando renderer.js');

  // =============================
  // UTILITÁRIOS
  // =============================
  
  const $ = (sel) => document.querySelector(sel);
  const setText = (sel, text) => {
    const el = $(sel);
    if (el) el.textContent = text != null ? String(text) : '';
  };
  const onlyDigits = (s = '') => String(s).replace(/\D/g, '');

  // Estado para impressão
  let currentCpf = null;
  let currentClienteNome = null;
  let currentProdutosParaImprimir = null;

  // Elementos DOM
  const dom = {
    inputCpf: $('#cpf'),
    inputEan: $('#ean'),
    nomeCliente: $('#cliente-nome'),
    descProduto: $('#produto-desc'),
    recomendados: $('#recomendados'),
    maisConsumidos: $('#mais-consumidos'),
    vendidosJuntos: $('#vendidos-juntos'),
    btnClearCpf: $('#btn-clear-cpf'),
    btnClearEan: $('#btn-clear-ean'),
    minimizeBtn: $('#minimize-btn'),
    toast: $('#toast'),
    // NOVOS ELEMENTOS PARA UPDATE
    checkUpdateBtn: $('#check-update-btn'),
    updateStatus: $('#update-status'),
    progressBar: $('#progress-bar'),
    progressFill: $('#progress-fill'),
    // BOTÃO IMPRIMIR
    btnImprimir: $('#btn-imprimir')
  };

  console.log('📋 Elementos DOM encontrados:', {
    inputCpf: !!dom.inputCpf,
    inputEan: !!dom.inputEan,
    minimizeBtn: !!dom.minimizeBtn,
    btnClearCpf: !!dom.btnClearCpf,
    btnClearEan: !!dom.btnClearEan,
    checkUpdateBtn: !!dom.checkUpdateBtn
  });

  // =============================
  // SISTEMA DE TOAST
  // =============================
  
  function showToast(message, duration = 2000, isError = false) {
    console.log('📢 Toast:', message);
    if (!dom.toast) return;
    
    dom.toast.textContent = message;
    dom.toast.className = isError ? 'toast error' : 'toast';
    dom.toast.classList.add('show');
    
    setTimeout(() => {
      dom.toast.classList.remove('show');
    }, duration);
  }

  // =============================
  // SISTEMA DE CLIPBOARD
  // =============================
  
  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback para contextos não seguros
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      showToast('✅ Copiado!');
    } catch (err) {
      console.error('Erro ao copiar:', err);
      showToast('❌ Erro ao copiar', 2000, true);
    }
  }

  // =============================
  // FORMATAÇÃO SEGURA DE NÚMEROS
  // =============================
  
  function safeToFixed(value, decimals = 2) {
    // Converte para number e trata casos problemáticos
    const num = parseFloat(value);
    if (isNaN(num) || num === null || num === undefined) {
      return '0.00';
    }
    return num.toFixed(decimals);
  }

  function formatPercentage(value) {
  const num = parseFloat(value);
  if (isNaN(num) || num === null || num === undefined) {
    return '0,00%';
  }
  return num.toFixed(2).replace('.', ',') + '%';
}

  // =============================
  // RENDERIZAÇÃO DE LISTAS
  // =============================
  
  function renderList(container, items, emptyMsg = 'Sem itens') {
    if (!container) return;
    container.innerHTML = '';
    
    if (!items || !items.length) {
      container.innerHTML = `<div class="empty">${emptyMsg}</div>`;
      return;
    }
    
    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'item';
      
      const ean = item.ean || '';
      const nome = item.nome || 'Produto sem descrição';
      const extra = item.total_de_compras ? ` (x${item.total_de_compras})` : '';
      
      // Container do conteúdo principal
      const itemContent = document.createElement('div');
      itemContent.className = 'item-content';
      
      // EAN (clicável para copiar)
      if (ean) {
        const eanSpan = document.createElement('span');
        eanSpan.className = 'item-ean';
        eanSpan.textContent = ean;
        eanSpan.title = 'Clique para copiar o EAN';
        eanSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          copyToClipboard(ean);
        });
        itemContent.appendChild(eanSpan);
      }
      
      // Nome/Descrição (clicável para copiar)
      const nameSpan = document.createElement('span');
      nameSpan.className = 'item-name';
      nameSpan.textContent = nome + extra;
      nameSpan.title = 'Clique para copiar a descrição';
      nameSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(nome);
      });
      itemContent.appendChild(nameSpan);
      
      row.appendChild(itemContent);
      
      // Tag com lift/confidence se disponível - VERSÃO CORRIGIDA
      if (item.lift !== undefined && item.confidence !== undefined) {
        try {
          const liftNum = parseFloat(item.lift);
          const confNum = parseFloat(item.confidence);
          
          if (!isNaN(liftNum) && !isNaN(confNum) && (liftNum > 0 || confNum > 0)) {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = formatPercentage(liftNum);
            tag.title = `Lift: ${safeToFixed(liftNum)}, Confidence: ${safeToFixed(confNum)}`;
            row.appendChild(tag);
          }
        } catch (error) {
          console.warn('⚠️ Erro ao processar lift/confidence:', error);
          // Não adiciona tag se der erro
        }
      }
      
      container.appendChild(row);
    }
  }

  // =============================
  // FUNÇÕES DE BUSCA
  // =============================
  
  async function buscarClientePorCpf(cpfInput) {
    console.log('🔍 Buscando cliente por CPF:', cpfInput);
    const cpf = onlyDigits(cpfInput);
    if (!cpf) {
      setText('#cliente-nome', '');
      renderList(dom.recomendados, [], 'Sem recomendações');
      renderList(dom.maisConsumidos, [], 'Sem dados');
      return;
    }

    try {
      showToast('🔄 Buscando cliente...', 1000);

      // Verificar se API está disponível
      if (!window.DB) {
        throw new Error('API DB não disponível');
      }

      // Buscar dados do cliente
      const cliente = await window.DB.buscarClientePorCpf(cpf);
      
      if (!cliente.found) {
        setText('#cliente-nome', 'Cliente não encontrado');
        renderList(dom.recomendados, [], 'Cliente não encontrado');
        renderList(dom.maisConsumidos, [], 'Cliente não encontrado');
        showToast('⚠️ Cliente não encontrado', 2000, true);
        return;
      }

      setText('#cliente-nome', cliente.nome || 'Cliente');

      // Buscar recomendações em paralelo
      const [recomendacoes, maisConsumidos] = await Promise.all([
        window.DB.buscarRecomendacoesCpf(cpf, 6),
        window.DB.buscarMaisConsumidos(cpf, 6)
      ]);

      // Renderizar listas
      renderList(dom.recomendados, recomendacoes, 'Sem recomendações');
      renderList(dom.maisConsumidos, maisConsumidos, 'Sem dados de consumo');

      showToast('✅ Cliente encontrado!');
      console.log('✅ Cliente encontrado:', {
        nome: cliente.nome,
        recomendacoes: recomendacoes.length,
        maisConsumidos: maisConsumidos.length
      });

      // ========================================
      // LÓGICA DE IMPRESSÃO: uso contínuo + mais consumidos
      // ========================================
      currentCpf = cpf;
      currentClienteNome = cliente.nome;
      currentProdutosParaImprimir = null;

      // 1. Buscar produtos uso contínuo (≤35 dias)
      let produtosFilipeta = [];
      try {
        const usoContinuo = await window.DB.buscarProdutosUsoContinuo(cpf);
        console.log('📋 Uso contínuo RAW:', JSON.stringify(usoContinuo?.slice(0, 5)));
        const filtrados = (usoContinuo || [])
          .filter(p => p.dias_sem_compras <= 35 && String(p.nome || '').trim().length > 0)
          .map(p => ({ 
            ean: String(p.ean || '').replace(/\D/g, ''), 
            nome: String(p.nome || '').trim() 
          }));
        console.log('📋 Uso contínuo após filtro ≤35 dias:', filtrados.length, filtrados.map(p => p.ean + ' | ' + p.nome));
        produtosFilipeta = filtrados.slice(0, 5);
        console.log(`📋 Uso contínuo ≤35 dias: ${produtosFilipeta.length} produtos`);
      } catch (err) {
        console.warn('⚠️ Erro ao buscar uso contínuo para filipeta:', err);
      }

      // 2. Completar com mais consumidos até 5, sem duplicar EAN
      if (produtosFilipeta.length < 5) {
        const eansJaUsados = new Set(produtosFilipeta.map(p => p.ean));
        for (const p of maisConsumidos) {
          if (produtosFilipeta.length >= 5) break;
          if (!eansJaUsados.has(p.ean)) {
            produtosFilipeta.push({ ean: p.ean, nome: p.nome });
            eansJaUsados.add(p.ean);
          }
        }
        console.log(`📋 Total após completar com mais consumidos: ${produtosFilipeta.length}`);
      }

      // 3. Completar com recomendados até 5, sem duplicar EAN
      if (produtosFilipeta.length < 5) {
        const eansJaUsados = new Set(produtosFilipeta.map(p => p.ean));
        for (const p of recomendacoes) {
          if (produtosFilipeta.length >= 5) break;
          if (p.ean && !eansJaUsados.has(p.ean)) {
            produtosFilipeta.push({ ean: p.ean, nome: p.nome });
            eansJaUsados.add(p.ean);
          }
        }
        console.log(`📋 Total após completar com recomendados: ${produtosFilipeta.length}`);
      }

      // 3. Buscar preços e validar
      if (produtosFilipeta.length > 0 && window.DB.buscarPrecosFilipeta) {
        try {
          const eans = produtosFilipeta.map(p => p.ean).filter(Boolean);
          const nomes = produtosFilipeta.map(p => p.nome).filter(Boolean);
          console.log('🔍 EANs para buscar preços:', eans);
          console.log('🔍 Nomes para buscar preços:', nomes);
          const precos = await window.DB.buscarPrecosFilipeta(eans, nomes);
          console.log('💰 Preços retornados:', precos.map(p => p.ean + ' - ' + p.nome_produto));

          // Mapear por EAN e por nome
          const precosMapEan = new Map();
          const precosMapNome = new Map();
          for (const p of precos) {
            precosMapEan.set(p.ean, p);
            if (p.nome_produto) precosMapNome.set(p.nome_produto.toUpperCase().trim(), p);
          }

          const merged = produtosFilipeta.map(p => {
            // Tentar por EAN primeiro, depois por nome
            let preco = precosMapEan.get(p.ean);
            if (!preco && p.nome) {
              preco = precosMapNome.get(p.nome.toUpperCase().trim());
            }
            if (!preco) {
              console.warn('⚠️ SEM PREÇO - EAN:', p.ean, '| Nome:', p.nome);
            }
            return {
              ean: p.ean,
              nome: p.nome,
              preco_de: preco ? preco.preco_de : null,
              preco_por: preco ? preco.preco_por : null
            };
          });

          const semPreco = merged.filter(p => p.preco_de === null || p.preco_por === null);
          if (semPreco.length > 0) {
            console.log('⚠️ Produtos sem preço:', semPreco.map(p => p.ean + ' - ' + p.nome).join(', '));
          }
          currentProdutosParaImprimir = merged;
          if (dom.btnImprimir) dom.btnImprimir.style.display = 'block';
          console.log('🖨️ Impressão disponível: ' + merged.length + ' produtos (' + (merged.length - semPreco.length) + ' com preço)');
        } catch (err) {
          console.error('❌ Erro ao buscar preços para impressão:', err);
          if (dom.btnImprimir) dom.btnImprimir.style.display = 'none';
        }
      } else {
        if (dom.btnImprimir) dom.btnImprimir.style.display = 'none';
      }

      // ========================================
      // NOVA FUNCIONALIDADE: POPUP DE USO CONTÍNUO
      // ========================================
      
      // Tentar abrir popup de uso contínuo após encontrar o cliente
      // Executar com delay para não interferir na busca principal
      setTimeout(async () => {
        try {
          if (window.electronAPI && window.electronAPI.abrirPopupUsoContinuo) {
            console.log('🪟 Tentando abrir popup de uso contínuo para CPF:', cpf);
            const resultado = await window.electronAPI.abrirPopupUsoContinuo(cpf);
            
            if (resultado.success) {
              console.log('✅ Popup de uso contínuo aberto com sucesso');
            } else {
              console.log('ℹ️ Popup não aberto - sem produtos de uso contínuo para este cliente');
            }
          } else {
            console.warn('⚠️ API de popup não disponível');
          }
        } catch (error) {
          console.error('❌ Erro ao abrir popup de uso contínuo:', error);
          // Não mostrar toast de erro para não incomodar o usuário
          // O popup é uma funcionalidade adicional, não crítica
        }
      }, 800); // Delay de 800ms para garantir que a busca principal termine

    } catch (error) {
      console.error('❌ Erro ao buscar cliente:', error);
      setText('#cliente-nome', 'Erro ao buscar cliente');
      renderList(dom.recomendados, [], 'Erro na consulta');
      renderList(dom.maisConsumidos, [], 'Erro na consulta');
      showToast('❌ Erro ao buscar cliente', 3000, true);
    }
  }

  async function buscarProdutoPorEan(eanInput) {
    console.log('🔍 Buscando produto por EAN:', eanInput);
    const ean = onlyDigits(String(eanInput || ''));
    
    if (!ean || ean.length < 4) {
      setText('#produto-desc', '');
      renderList(dom.vendidosJuntos, [], 'Sem relacionados');
      return;
    }

    try {
      showToast('🔄 Buscando produto...', 1000);

      // Verificar se API está disponível
      if (!window.DB) {
        throw new Error('API DB não disponível');
      }

      // Buscar produto e relacionados em paralelo
      const [produto, vendidosJuntos] = await Promise.all([
        window.DB.buscarProdutoPorEan(ean),
        window.DB.buscarVendidosJuntos(ean, 10)
      ]);

      // Atualizar descrição do produto
      setText('#produto-desc', produto.nome || 'Produto sem descrição');

      // Renderizar produtos vendidos juntos
      renderList(dom.vendidosJuntos, vendidosJuntos, 'Sem produtos relacionados');

      // Toast informativo
      if (produto.origem === 'nao_encontrado') {
        showToast('⚠️ Produto não encontrado', 2000, true);
      } else {
        showToast('✅ Produto encontrado!');
      }

      console.log('🔍 Produto encontrado:', {
        ean: produto.ean,
        nome: produto.nome,
        origem: produto.origem,
        vendidosJuntos: vendidosJuntos.length
      });

    } catch (error) {
      console.error('❌ Erro ao buscar produto:', error);
      setText('#produto-desc', 'Erro na consulta');
      renderList(dom.vendidosJuntos, [], 'Erro na consulta');
      showToast('❌ Erro ao buscar produto', 3000, true);
    }
  }

  // ========================================
  // NOVA FUNCIONALIDADE: POPUP USO CONTÍNUO MANUAL
  // ========================================

  // Função para abrir popup de uso contínuo manualmente
  async function abrirPopupUsoContinuo(cpf) {
    try {
      if (!cpf) {
        const cpfInput = dom.inputCpf?.value;
        if (!cpfInput) {
          showToast('⚠️ Digite um CPF primeiro', 2000, true);
          return;
        }
        cpf = onlyDigits(cpfInput);
      }

      if (window.electronAPI && window.electronAPI.abrirPopupUsoContinuo) {
        showToast('🔄 Verificando uso contínuo...', 1000);
        
        const resultado = await window.electronAPI.abrirPopupUsoContinuo(cpf);
        
        if (resultado.success) {
          showToast('✅ Popup de uso contínuo aberto!');
        } else {
          showToast('ℹ️ Nenhum produto de uso contínuo encontrado para este cliente', 3000);
        }
      } else {
        showToast('❌ Funcionalidade não disponível', 2000, true);
      }
    } catch (error) {
      console.error('❌ Erro ao abrir popup manualmente:', error);
      showToast('❌ Erro ao carregar dados de uso contínuo', 3000, true);
    }
  }

  // ========================================
  // SISTEMA DE UPDATES - NOVA FUNCIONALIDADE
  // ========================================

  async function verificarAtualizacoes() {
    console.log('🔄 Verificando atualizações...');
    
    if (!dom.checkUpdateBtn || !dom.updateStatus) {
      console.error('❌ Elementos de update não encontrados');
      return;
    }

    try {
      // Desabilitar botão e mostrar status
      dom.checkUpdateBtn.disabled = true;
      dom.checkUpdateBtn.textContent = '🔍 VERIFICANDO...';
      dom.updateStatus.style.display = 'block';
      dom.updateStatus.className = 'update-status checking';
      dom.updateStatus.innerHTML = '🔍 Verificando atualizações no GitHub...';
      
      // Versão atual (pode ser obtida do package.json ou HTML)
      const versaoAtual = "1.10.0";
      
      // Consultar API do GitHub
      console.log('📡 Consultando API do GitHub...');
      const response = await fetch('https://api.github.com/repos/barbosaj1983/filipeta/releases/latest');
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const release = await response.json();
      const versaoNova = release.tag_name.replace('v', '');
      
      console.log(`📋 Versão atual: ${versaoAtual}`);
      console.log(`📋 Versão disponível: ${versaoNova}`);
      
      if (versaoNova === versaoAtual) {
        // Não há atualizações
        dom.updateStatus.className = 'update-status available';
        dom.updateStatus.innerHTML = `✅ Você já tem a versão mais recente (v${versaoAtual})`;
        dom.checkUpdateBtn.textContent = '✅ ATUALIZADO';
        showToast('✅ App atualizado!');
        
        setTimeout(() => {
          dom.updateStatus.style.display = 'none';
          dom.checkUpdateBtn.disabled = false;
          dom.checkUpdateBtn.textContent = '🔄 UPDATE';
        }, 3000);
        
        return;
      }
      
      // Nova versão disponível
      dom.updateStatus.className = 'update-status available';
      dom.updateStatus.innerHTML = `🎉 Nova versão disponível: v${versaoNova}<br>📥 Preparando instalação segura...`;
      showToast(`🎉 Nova versão v${versaoNova} encontrada!`);
      
      // Encontrar arquivo .exe
      const exeAsset = release.assets.find(asset => asset.name.endsWith('.exe'));
      
      if (!exeAsset) {
        throw new Error('Arquivo .exe não encontrado na release');
      }
      
      // Verificar se temos API electronAPI para download seguro
      if (!window.electronAPI || !window.electronAPI.downloadAndInstallUpdate) {
        // Fallback: usar método do navegador
        await downloadUpdateBrowser(exeAsset, versaoNova);
        return;
      }
      
      // Usar API nativa do Electron para download seguro
      await downloadUpdateSecure(exeAsset, versaoNova);
      
    } catch (error) {
      console.error('❌ Erro ao verificar updates:', error);
      
      dom.updateStatus.className = 'update-status error';
      dom.updateStatus.innerHTML = `❌ Erro ao verificar atualizações<br><small>${error.message}</small>`;
      showToast('❌ Erro ao verificar atualizações', 3000, true);
      
      setTimeout(() => {
        dom.updateStatus.style.display = 'none';
      }, 5000);
      
    } finally {
      // Restaurar botão
      setTimeout(() => {
        dom.checkUpdateBtn.disabled = false;
        dom.checkUpdateBtn.textContent = '🔄 UPDATE';
      }, 2000);
    }
  }

  // Download e instalação segura via API nativa do Electron
  async function downloadUpdateSecure(exeAsset, versaoNova) {
    try {
      dom.updateStatus.className = 'update-status downloading';
      dom.updateStatus.innerHTML = `📥 Baixando v${versaoNova} em pasta temporária...<br><small>Instalação automática ativada</small>`;
      
      if (dom.progressBar && dom.progressFill) {
        dom.progressBar.style.display = 'block';
        dom.progressFill.style.width = '0%';
      }
      
      // Simular progresso durante download
      const progressInterval = setInterval(() => {
        const currentWidth = parseFloat(dom.progressFill.style.width) || 0;
        if (currentWidth < 85) {
          dom.progressFill.style.width = (currentWidth + Math.random() * 10) + '%';
        }
      }, 500);
      
      // Usar API do Electron para download seguro
      const result = await window.electronAPI.downloadAndInstallUpdate({
        url: exeAsset.browser_download_url,
        filename: exeAsset.name,
        version: versaoNova
      });
      
      clearInterval(progressInterval);
      dom.progressFill.style.width = '100%';
      
      if (result.success) {
        dom.updateStatus.className = 'update-status ready';
        dom.updateStatus.innerHTML = `🚀 Instalação iniciada automaticamente!<br><small>Arquivo será removido após instalação</small>`;
        showToast(`🚀 Instalando v${versaoNova} automaticamente...`, 3000);
        
        // Avisar que o app será fechado
        setTimeout(() => {
          dom.updateStatus.innerHTML = `⚡ Finalizando app para instalar v${versaoNova}...<br><small>Reinicie após a instalação</small>`;
          showToast('⚡ App será fechado para instalação...', 2000);
        }, 2000);
        
      } else {
        throw new Error(result.error || 'Falha na instalação automática');
      }
      
    } catch (error) {
      console.error('❌ Erro no download seguro:', error);
      // Fallback para método do navegador
      await downloadUpdateBrowser(exeAsset, versaoNova);
    }
  }

  // Fallback: download via navegador (método original)
  async function downloadUpdateBrowser(exeAsset, versaoNova) {
    dom.updateStatus.className = 'update-status downloading';
    dom.updateStatus.innerHTML = `📥 Baixando v${versaoNova}...<br><small>Modo compatibilidade ativado</small>`;
    
    if (dom.progressBar && dom.progressFill) {
      dom.progressBar.style.display = 'block';
      
      // Simular progresso
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        dom.progressFill.style.width = progress + '%';
      }, 500);
      
      // Baixar arquivo
      console.log('📥 Download via navegador...');
      const downloadResponse = await fetch(exeAsset.browser_download_url);
      
      if (!downloadResponse.ok) {
        throw new Error(`Erro no download: ${downloadResponse.status}`);
      }
      
      const blob = await downloadResponse.blob();
      
      // Finalizar progresso
      clearInterval(progressInterval);
      dom.progressFill.style.width = '100%';
      
      // Criar URL para download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exeAsset.name;
      
      // Atualizar status
      dom.updateStatus.className = 'update-status ready';
      dom.updateStatus.innerHTML = `✅ Download concluído!<br>🚀 Execute o arquivo baixado para instalar v${versaoNova}`;
      
      // Iniciar download automaticamente
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showToast(`📥 Arquivo v${versaoNova} baixado na pasta Downloads`, 4000);
      
      setTimeout(() => {
        dom.progressBar.style.display = 'none';
        dom.progressFill.style.width = '0%';
      }, 3000);
    }
  }

  // =============================
  // FUNÇÕES DE LIMPEZA
  // =============================
  
  function limparCpf() {
    console.log('🧹 Limpando CPF');
    if (dom.inputCpf) {
      dom.inputCpf.value = '';
      dom.inputCpf.focus();
    }
    setText('#cliente-nome', '');
    renderList(dom.recomendados, [], 'Sem recomendações');
    renderList(dom.maisConsumidos, [], 'Sem dados');
    currentCpf = null;
    currentClienteNome = null;
    currentProdutosParaImprimir = null;
    if (dom.btnImprimir) dom.btnImprimir.style.display = 'none';
    showToast('🧹 CPF limpo');
  }

  function limparEan() {
    console.log('🧹 Limpando EAN');
    if (dom.inputEan) {
      dom.inputEan.value = '';
      dom.inputEan.focus();
    }
    setText('#produto-desc', '');
    renderList(dom.vendidosJuntos, [], 'Sem relacionados');
    showToast('🧹 EAN limpo');
  }

  // =============================
  // FUNÇÃO MINIMIZAR
  // =============================
  
  async function minimizarJanela() {
    console.log('📽 Tentando minimizar janela');
    try {
      if (window.electronAPI && window.electronAPI.minimizeWindow) {
        const result = await window.electronAPI.minimizeWindow();
        if (result.success) {
          console.log('✅ Janela minimizada com sucesso');
        } else {
          console.error('❌ Falha ao minimizar:', result.error);
          showToast('❌ Erro ao minimizar', 2000, true);
        }
      } else {
        console.warn('⚠️ electronAPI não disponível');
        showToast('⚠️ Função minimizar não disponível', 2000, true);
      }
    } catch (error) {
      console.error('❌ Erro ao minimizar:', error);
      showToast('❌ Erro ao minimizar janela', 2000, true);
    }
  }

  // =============================
  // FUNÇÕES UTILITÁRIAS
  // =============================
  
  async function testarConexao() {
    try {
      showToast('🔄 Testando conexão...', 1000);
      if (!window.DB) {
        throw new Error('API DB não disponível');
      }
      
      const resultado = await window.DB.testarConexao();
      
      if (resultado.success) {
        showToast('✅ Conexão OK com Neon', 2000);
        console.log('✅ Teste de conexão bem-sucedido');
      } else {
        showToast('❌ Falha na conexão: ' + resultado.message, 3000, true);
        console.error('❌ Teste de conexão falhou:', resultado.message);
      }
    } catch (error) {
      console.error('❌ Erro no teste de conexão:', error);
      showToast('❌ Erro no teste de conexão', 3000, true);
    }
  }

  async function limparCache() {
    try {
      if (!window.DB) {
        throw new Error('API DB não disponível');
      }
      await window.DB.limparCache();
      showToast('🗑️ Cache limpo!', 2000);
      console.log('🗑️ Cache limpo com sucesso');
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
      showToast('❌ Erro ao limpar cache', 2000, true);
    }
  }

  // =============================
  // FUNÇÃO IMPRIMIR FILIPETA
  // =============================

  async function imprimirFilipeta() {
    if (!currentProdutosParaImprimir || !currentCpf) {
      showToast('⚠️ Busque um CPF primeiro', 2000, true);
      return;
    }

    if (!window.electronAPI || !window.electronAPI.imprimirFilipeta) {
      showToast('❌ Função de impressão não disponível', 2000, true);
      return;
    }

    try {
      if (dom.btnImprimir) {
        dom.btnImprimir.disabled = true;
        dom.btnImprimir.textContent = 'IMPRIMINDO...';
      }

      showToast('🖨️ Preparando filipeta...', 2000);

      const result = await window.electronAPI.imprimirFilipeta({
        cpf: currentCpf,
        nomeCliente: currentClienteNome,
        produtos: currentProdutosParaImprimir
      });

      if (result.success) {
        showToast('✅ Filipeta enviada para impressão!', 3000);
      } else {
        showToast('❌ Erro na impressão: ' + (result.error || 'desconhecido'), 3000, true);
      }
    } catch (error) {
      console.error('❌ Erro ao imprimir filipeta:', error);
      showToast('❌ Erro ao imprimir filipeta', 3000, true);
    } finally {
      if (dom.btnImprimir) {
        dom.btnImprimir.disabled = false;
        dom.btnImprimir.textContent = 'IMPRIMIR FILIPETA';
      }
    }
  }

  // =============================
  // EVENTOS E BINDINGS
  // =============================
  
  function bindEventListeners() {
    console.log('🔗 Configurando event listeners');

    // CPF - eventos de busca
    if (dom.inputCpf) {
      console.log('✅ Configurando eventos do input CPF');
      
      // Enter para buscar
      dom.inputCpf.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          buscarClientePorCpf(dom.inputCpf.value);
        }
      });

      // Blur para buscar (se tiver conteúdo)
      dom.inputCpf.addEventListener('blur', () => {
        const valor = dom.inputCpf.value;
        if (valor && onlyDigits(valor).length >= 11) {
          buscarClientePorCpf(valor);
        }
      });
    } else {
      console.warn('⚠️ Input CPF não encontrado');
    }

    // EAN - eventos de busca
    if (dom.inputEan) {
      console.log('✅ Configurando eventos do input EAN');
      
      // Enter para buscar
      dom.inputEan.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          buscarProdutoPorEan(dom.inputEan.value);
        }
      });

      // Blur para buscar (se tiver conteúdo)
      dom.inputEan.addEventListener('blur', () => {
        const valor = dom.inputEan.value;
        if (valor && onlyDigits(valor).length >= 4) {
          buscarProdutoPorEan(valor);
        }
      });

      // Input para busca automática com EAN completo
      dom.inputEan.addEventListener('input', () => {
        const valor = dom.inputEan.value;
        const digitos = onlyDigits(valor);
        // Busca automática para códigos com 13 dígitos (EAN-13)
        if (digitos.length >= 13) {
          buscarProdutoPorEan(valor);
        }
      });
    } else {
      console.warn('⚠️ Input EAN não encontrado');
    }

    // Botões de busca
    const btnBuscarCpf = $('#btn-buscar-cpf');
    if (btnBuscarCpf) {
      console.log('✅ Configurando botão buscar CPF');
      btnBuscarCpf.addEventListener('click', () => {
        console.log('🖱️ Clique no botão buscar CPF');
        buscarClientePorCpf(dom.inputCpf?.value || '');
      });
    } else {
      console.warn('⚠️ Botão buscar CPF não encontrado');
    }

    const btnOkEan = $('#btn-ok-ean');
    if (btnOkEan) {
      console.log('✅ Configurando botão OK EAN');
      btnOkEan.addEventListener('click', () => {
        console.log('🖱️ Clique no botão OK EAN');
        buscarProdutoPorEan(dom.inputEan?.value || '');
      });
    } else {
      console.warn('⚠️ Botão OK EAN não encontrado');
    }

    // Botões de limpeza
    if (dom.btnClearCpf) {
      console.log('✅ Configurando botão limpar CPF');
      dom.btnClearCpf.addEventListener('click', () => {
        console.log('🖱️ Clique no botão limpar CPF');
        limparCpf();
      });
    } else {
      console.warn('⚠️ Botão limpar CPF não encontrado');
    }

    if (dom.btnClearEan) {
      console.log('✅ Configurando botão limpar EAN');
      dom.btnClearEan.addEventListener('click', () => {
        console.log('🖱️ Clique no botão limpar EAN');
        limparEan();
      });
    } else {
      console.warn('⚠️ Botão limpar EAN não encontrado');
    }

    // Botão minimizar
    if (dom.minimizeBtn) {
      console.log('✅ Configurando botão minimizar');
      dom.minimizeBtn.addEventListener('click', () => {
        console.log('🖱️ Clique no botão minimizar');
        minimizarJanela();
      });
    } else {
      console.warn('⚠️ Botão minimizar não encontrado');
    }

    // NOVO: Botão verificar updates
    if (dom.checkUpdateBtn) {
      console.log('✅ Configurando botão verificar updates');
      dom.checkUpdateBtn.addEventListener('click', () => {
        console.log('🖱️ Clique no botão verificar updates');
        verificarAtualizacoes();
      });
    } else {
      console.warn('⚠️ Botão verificar updates não encontrado');
    }

    // NOVO: Botão imprimir filipeta
    if (dom.btnImprimir) {
      console.log('✅ Configurando botão imprimir filipeta');
      dom.btnImprimir.addEventListener('click', () => {
        console.log('🖱️ Clique no botão imprimir filipeta');
        imprimirFilipeta();
      });
    }

    // Atalhos de teclado globais
    document.addEventListener('keydown', (e) => {
      // Ctrl+M para minimizar
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        console.log('⌨️ Atalho Ctrl+M para minimizar');
        minimizarJanela();
      }
      
      // F1 para testar conexão
      if (e.key === 'F1') {
        e.preventDefault();
        console.log('⌨️ Atalho F1 para testar conexão');
        testarConexao();
      }
      
      // F5 para limpar cache
      if (e.key === 'F5') {
        e.preventDefault();
        console.log('⌨️ Atalho F5 para limpar cache');
        limparCache();
      }

      // F2 para abrir popup de uso contínuo manualmente
      if (e.key === 'F2') {
        e.preventDefault();
        console.log('⌨️ Atalho F2 para popup uso contínuo');
        abrirPopupUsoContinuo();
      }

      // NOVO: F9 para verificar updates
      if (e.key === 'F9') {
        e.preventDefault();
        console.log('⌨️ Atalho F9 para verificar updates');
        verificarAtualizacoes();
      }

      // NOVO: F3 para imprimir filipeta
      if (e.key === 'F3') {
        e.preventDefault();
        console.log('⌨️ Atalho F3 para imprimir filipeta');
        imprimirFilipeta();
      }
    });

    console.log('✅ Todos os event listeners configurados');
  }

  // =============================
  // INICIALIZAÇÃO
  // =============================
  
  function inicializar() {
    console.log('🚀 Inicializando Filipeta Assistente de Balcão');
    
    // Verificar se APIs estão disponíveis
    if (!window.DB) {
      console.error('❌ API DB não disponível');
      showToast('❌ Erro: API DB não disponível', 5000, true);
      return;
    } else {
      console.log('✅ API DB disponível');
    }

    if (!window.electronAPI) {
      console.warn('⚠️ electronAPI não disponível - botão minimizar pode não funcionar');
    } else {
      console.log('✅ electronAPI disponível');
      
      // Verificar se APIs do popup estão disponíveis
      if (window.electronAPI.abrirPopupUsoContinuo) {
        console.log('✅ API popup de uso contínuo disponível');
      } else {
        console.warn('⚠️ API popup de uso contínuo não disponível');
      }
    }

    // Configurar eventos
    bindEventListeners();

    // Testar conexão inicial
    setTimeout(() => {
      console.log('🔄 Testando conexão inicial');
      testarConexao();
    }, 1000);

    // Log de configuração
    if (window.APP_CONFIG) {
      console.log('⚙️ Configuração:', window.APP_CONFIG);
    }

    // Focar no input CPF
    if (dom.inputCpf) {
      dom.inputCpf.focus();
      console.log('🎯 Foco definido no input CPF');
    }

    showToast('🚀 Sistema inicializado!', 2000);
    console.log('✅ Filipeta inicializado com sucesso');
    console.log('📋 Atalhos disponíveis:');
    console.log('   F1 - Testar conexão');
    console.log('   F2 - Abrir popup uso contínuo');
    console.log('   F5 - Limpar cache');
    console.log('   F9 - Verificar updates');
    console.log('   Ctrl+M - Minimizar janela');
  }

  // =============================
  // TRATAMENTO DE ERROS GLOBAIS
  // =============================
  
  window.addEventListener('error', (event) => {
    console.error('❌ Erro global:', event.error);
    showToast('❌ Erro inesperado', 3000, true);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promise rejeitada:', event.reason);
    showToast('❌ Erro de conexão', 3000, true);
  });

  // =============================
  // INICIALIZAÇÃO QUANDO DOM PRONTO
  // =============================
  
  if (document.readyState === 'loading') {
    console.log('🔄 DOM ainda carregando, aguardando DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', inicializar);
  } else {
    console.log('🔄 DOM já carregado, inicializando imediatamente');
    inicializar();
  }

  // Expor funções para debug no console
  window.filipetaDebug = {
    testarConexao,
    limparCache,
    buscarClientePorCpf,
    buscarProdutoPorEan,
    minimizarJanela,
    abrirPopupUsoContinuo,
    verificarAtualizacoes,
    imprimirFilipeta,
    dom,
    safeToFixed,
    formatPercentage
  };

  console.log('🛠️ Debug tools disponíveis em window.filipetaDebug');

})();