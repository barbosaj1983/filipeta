const fs = require('fs');
const path = require('path');

/**
 * Script para atualizar versão no HTML da Filipeta
 * Corrige versões hardcoded na interface
 */

function updateHTMLVersion() {
    console.log('🔄 Atualizando versão no HTML...');
    
    try {
        // Ler versão atual do package.json
        const pkg = require('../package.json');
        const currentVersion = pkg.version;
        
        console.log(`📦 Versão atual: ${currentVersion}`);
        
        // Arquivos para atualizar
        const files = [
            path.join(__dirname, '..', 'index.html'),
            path.join(__dirname, '..', 'popup.html'),
            path.join(__dirname, '..', 'renderer.js')
        ];
        
        let totalUpdates = 0;
        
        files.forEach(filePath => {
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️  Arquivo não encontrado: ${path.basename(filePath)}`);
                return;
            }
            
            console.log(`\n🔍 Processando: ${path.basename(filePath)}`);
            
            let content = fs.readFileSync(filePath, 'utf8');
            const originalContent = content;
            
            // Padrões para substituir versões hardcoded
            const patterns = [
                // Versão 1.2.0 específica (o problema atual)
                { regex: /1\.2\.0/g, replacement: currentVersion, desc: 'Versão 1.2.0' },
                
                // Padrões HTML
                { regex: /<span[^>]*>Versão\s+v?[\d.]+<\/span>/gi, replacement: `<span>Versão v${currentVersion}</span>`, desc: 'Span versão' },
                { regex: /<div[^>]*>v[\d.]+<\/div>/gi, replacement: `<div>v${currentVersion}</div>`, desc: 'Div versão' },
                
                // Padrões JavaScript
                { regex: /const\s+version\s*=\s*['"`]v?[\d.]+['"`]/gi, replacement: `const version = '${currentVersion}'`, desc: 'Const version JS' },
                { regex: /let\s+version\s*=\s*['"`]v?[\d.]+['"`]/gi, replacement: `let version = '${currentVersion}'`, desc: 'Let version JS' },
                { regex: /var\s+version\s*=\s*['"`]v?[\d.]+['"`]/gi, replacement: `var version = '${currentVersion}'`, desc: 'Var version JS' },
                
                // Padrões de texto
                { regex: /Versão\s+v?[\d.]+/gi, replacement: `Versão v${currentVersion}`, desc: 'Texto versão' },
                { regex: /Version\s+v?[\d.]+/gi, replacement: `Version v${currentVersion}`, desc: 'Texto version' },
                
                // Padrões data attributes
                { regex: /data-version\s*=\s*['"`]v?[\d.]+['"`]/gi, replacement: `data-version="v${currentVersion}"`, desc: 'Data attribute' },
                
                // Padrões de comentários
                { regex: /\/\*\s*v[\d.]+\s*\*\//gi, replacement: `/* v${currentVersion} */`, desc: 'Comentário versão' },
                { regex: /\/\/\s*v[\d.]+/gi, replacement: `// v${currentVersion}`, desc: 'Comentário linha' },
            ];
            
            let fileUpdates = 0;
            
            patterns.forEach(pattern => {
                const matches = content.match(pattern.regex);
                if (matches && matches.length > 0) {
                    content = content.replace(pattern.regex, pattern.replacement);
                    fileUpdates += matches.length;
                    console.log(`  ✅ ${pattern.desc}: ${matches.length} ocorrência(s)`);
                }
            });
            
            // Salvar se houve mudanças
            if (content !== originalContent) {
                fs.writeFileSync(filePath, content, 'utf8');
                totalUpdates += fileUpdates;
                console.log(`  📝 ${path.basename(filePath)}: ${fileUpdates} atualizações`);
            } else {
                console.log(`  📋 ${path.basename(filePath)}: nenhuma alteração necessária`);
            }
        });
        
        // Verificar se version.js existe e criar/atualizar
        const versionJsPath = path.join(__dirname, '..', 'version.js');
        const versionInfo = require('../version.js');
        
        if (versionInfo.version !== currentVersion) {
            console.log('\n🔄 Atualizando version.js...');
            
            const versionContent = `// Auto-generated version file
module.exports = {
    version: '${currentVersion}',
    buildDate: '${new Date().toISOString().split('T')[0]}',
    buildTimestamp: ${Date.now()},
    
    // Métodos utilitários
    getVersionString: () => \`v\${module.exports.version}\`,
    getBuildString: () => \`Build \${module.exports.buildTimestamp}\`,
    getFullVersionString: () => \`v\${module.exports.version} - Build \${new Date(module.exports.buildTimestamp).toLocaleDateString()}\`
};`;
            
            fs.writeFileSync(versionJsPath, versionContent);
            console.log('✅ version.js atualizado');
        }
        
        // Resumo
        console.log('\n📊 Resumo da atualização:');
        console.log(`   📦 Versão: ${currentVersion}`);
        console.log(`   🔄 Total de atualizações: ${totalUpdates}`);
        console.log(`   📁 Arquivos processados: ${files.length}`);
        
        if (totalUpdates > 0) {
            console.log('\n✅ Versão HTML atualizada com sucesso!');
        } else {
            console.log('\n📋 Nenhuma versão hardcoded encontrada');
        }
        
        return totalUpdates > 0;
        
    } catch (error) {
        console.error('❌ Erro ao atualizar versão HTML:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    updateHTMLVersion();
}

module.exports = updateHTMLVersion;