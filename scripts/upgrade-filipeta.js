const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script de Upgrade da Filipeta v1.2.1+
 * Integra versionamento automático e sistema de ícones
 * com o projeto existente
 */

class FilipetaUpgrade {
    constructor() {
        this.projectRoot = process.cwd();
        this.packagePath = path.join(this.projectRoot, 'package.json');
        this.backupPath = path.join(this.projectRoot, 'package.json.backup');
        
        console.log('🚀 Filipeta Upgrade Manager v1.2.1+');
        console.log(`📁 Projeto: ${this.projectRoot}`);
    }

    verifyProject() {
        console.log('\n🔍 Verificando projeto Filipeta...');
        
        if (!fs.existsSync(this.packagePath)) {
            console.error('❌ package.json não encontrado!');
            return false;
        }

        const pkg = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
        
        if (pkg.name !== 'assistente-balcao') {
            console.error('❌ Este não parece ser o projeto Filipeta!');
            console.error(`   Nome encontrado: ${pkg.name}`);
            console.error('   Nome esperado: assistente-balcao');
            return false;
        }

        console.log(`✅ Projeto Filipeta encontrado (v${pkg.version})`);
        console.log(`📋 Descrição: ${pkg.description}`);
        
        // Verificar arquivos principais
        const coreFiles = ['main.js', 'preload.js', 'renderer.js', 'index.html'];
        const missingFiles = coreFiles.filter(file => 
            !fs.existsSync(path.join(this.projectRoot, file))
        );
        
        if (missingFiles.length > 0) {
            console.warn('⚠️  Alguns arquivos principais não foram encontrados:');
            missingFiles.forEach(file => console.warn(`   - ${file}`));
            console.warn('   Continuando mesmo assim...');
        }

        return true;
    }

    backupCurrentPackage() {
        console.log('\n💾 Fazendo backup do package.json atual...');
        
        try {
            fs.copyFileSync(this.packagePath, this.backupPath);
            console.log(`✅ Backup criado: package.json.backup`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao criar backup:', error.message);
            return false;
        }
    }

    updatePackageJson() {
        console.log('\n📝 Atualizando package.json...');
        
        try {
            const currentPkg = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
            
            // Scripts atualizados (preservando os existentes)
            const newScripts = {
                ...currentPkg.scripts,
                "auto-version": "node scripts/auto-version.js",
                "generate-icons": "node scripts/generate-icons.js",
                "version": "npm run auto-version && npm run build-info",
                "prepack": "npm run version",
                "dist": "npm run version && electron-builder",
                "dist-win": "npm run version && electron-builder --win",
                "dist-mac": "npm run version && electron-builder --mac",
                "dist-linux": "npm run version && electron-builder --linux",
                "release": "standard-version",
                "release:minor": "standard-version --release-as minor",
                "release:major": "standard-version --release-as major",
                "release:patch": "standard-version --release-as patch",
                "setup": "node scripts/setup.js"
            };

            // DevDependencies atualizadas
            const newDevDeps = {
                ...currentPkg.devDependencies,
                "standard-version": "^9.5.0",
                "conventional-changelog-cli": "^4.1.0",
                "semver": "^7.5.4",
                "sharp": "^0.33.0"
            };

            // Configuração de build atualizada
            const updatedBuild = {
                ...currentPkg.build,
                "productName": "Filipeta - Assistente de Balcão", // Corrigir encoding
                "copyright": "Copyright © 2025 Filipeta Team",
                "extraResources": [
                    {
                        "from": "assets/",
                        "to": "assets/",
                        "filter": [
                            "**/*",
                            "!source/**/*"
                        ]
                    }
                ],
                "files": [
                    "**/*",
                    "!scripts/",
                    "!server/",
                    "!assets/source/",
                    "!.env*",
                    "!README.md",
                    "!test-*.js",
                    "!setup.js",
                    "!.versionrc.json",
                    "!CHANGELOG.md"
                ],
                "win": {
                    ...currentPkg.build.win,
                    "icon": "assets/icons/icon.ico"
                },
                "nsis": {
                    ...currentPkg.build.nsis,
                    "oneClick": false,
                    "allowElevation": true,
                    "allowToChangeInstallationDirectory": true,
                    "perMachine": false,
                    "include": "scripts/installer.nsh",
                    "installerIcon": "assets/icons/icon.ico",
                    "uninstallerIcon": "assets/icons/icon.ico",
                    "shortcutName": "Filipeta"
                },
                "mac": {
                    ...currentPkg.build.mac,
                    "icon": "assets/icons/icon.icns"
                },
                "linux": {
                    ...currentPkg.build.linux,
                    "icon": "assets/icons/icon.png"
                }
            };

            // Adicionar Volta para versionamento de Node
            const volta = {
                "node": "18.17.0",
                "npm": "9.6.7"
            };

            // Montar novo package.json
            const updatedPkg = {
                ...currentPkg,
                scripts: newScripts,
                devDependencies: newDevDeps,
                build: updatedBuild,
                volta: volta,
                keywords: [
                    ...currentPkg.keywords,
                    "assistente",
                    "inteligencia-artificial"
                ]
            };

            // Salvar
            fs.writeFileSync(this.packagePath, JSON.stringify(updatedPkg, null, 2) + '\n');
            
            console.log('✅ package.json atualizado com sucesso!');
            console.log('\n📋 Principais mudanças:');
            console.log('   ✨ Scripts de versionamento automático');
            console.log('   🎨 Sistema de geração de ícones');
            console.log('   📦 Configurações de build melhoradas');
            console.log('   🔧 Novas dependências para automação');
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao atualizar package.json:', error.message);
            return false;
        }
    }

    installDependencies() {
        console.log('\n📦 Instalando novas dependências...');
        
        try {
            console.log('🔄 Executando npm install...');
            execSync('npm install', { 
                stdio: 'inherit',
                cwd: this.projectRoot 
            });
            console.log('✅ Dependências instaladas com sucesso!');
            return true;
        } catch (error) {
            console.error('❌ Erro ao instalar dependências:', error.message);
            console.log('\n💡 Tente executar manualmente:');
            console.log('   npm install');
            return false;
        }
    }

    createDirectoryStructure() {
        console.log('\n📁 Criando estrutura de diretórios...');
        
        const dirs = [
            'scripts',
            'assets/icons',
            'assets/source',
            'assets/installer'
        ];
        
        dirs.forEach(dir => {
            const fullPath = path.join(this.projectRoot, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`✅ Criado: ${dir}/`);
            } else {
                console.log(`📁 Existe: ${dir}/`);
            }
        });
        
        return true;
    }

    migrateExistingAssets() {
        console.log('\n🔄 Migrando assets existentes...');
        
        const oldAssets = [
            { old: 'assets/icon.ico', new: 'assets/icons/icon.ico' },
            { old: 'assets/icon.icns', new: 'assets/icons/icon.icns' },
            { old: 'assets/icon.png', new: 'assets/icons/icon.png' }
        ];
        
        let migrated = 0;
        
        oldAssets.forEach(({ old, new: newPath }) => {
            const oldFullPath = path.join(this.projectRoot, old);
            const newFullPath = path.join(this.projectRoot, newPath);
            
            if (fs.existsSync(oldFullPath) && !fs.existsSync(newFullPath)) {
                try {
                    fs.copyFileSync(oldFullPath, newFullPath);
                    console.log(`✅ Migrado: ${old} → ${newPath}`);
                    migrated++;
                } catch (error) {
                    console.log(`⚠️  Erro ao migrar ${old}: ${error.message}`);
                }
            }
        });
        
        if (migrated === 0) {
            console.log('📋 Nenhum asset antigo para migrar');
        } else {
            console.log(`✅ ${migrated} asset(s) migrado(s)`);
        }
        
        return true;
    }

    createVersionrcConfig() {
        console.log('\n📝 Criando configuração de versionamento...');
        
        const versionrcPath = path.join(this.projectRoot, '.versionrc.json');
        
        if (fs.existsSync(versionrcPath)) {
            console.log('📋 .versionrc.json já existe, mantendo...');
            return true;
        }
        
        const versionrcConfig = {
            "types": [
                {"type": "feat", "section": "🚀 Novas Funcionalidades"},
                {"type": "fix", "section": "🐛 Correções"},
                {"type": "perf", "section": "⚡ Performance"},
                {"type": "refactor", "section": "♻️ Refatoração"},
                {"type": "docs", "section": "📚 Documentação"},
                {"type": "test", "section": "✅ Testes"},
                {"type": "build", "section": "🔧 Build"},
                {"type": "ci", "section": "👷 CI/CD"},
                {"type": "style", "hidden": true},
                {"type": "chore", "hidden": true}
            ],
            "releaseCommitMessageFormat": "chore(release): v{{currentTag}}",
            "commitUrlFormat": "{{host}}/{{owner}}/{{repository}}/commit/{{hash}}",
            "compareUrlFormat": "{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}"
        };
        
        fs.writeFileSync(versionrcPath, JSON.stringify(versionrcConfig, null, 2) + '\n');
        console.log('✅ .versionrc.json criado');
        
        return true;
    }

    createIconPlaceholder() {
        console.log('\n🎨 Configurando sistema de ícones...');
        
        const sourceDir = path.join(this.projectRoot, 'assets', 'source');
        const readmePath = path.join(sourceDir, 'README.md');
        
        const readmeContent = `# Ícones da Filipeta v1.2.1+

## 🎯 IMPORTANTE: Coloque seu ícone master aqui

### 📥 Nome do arquivo:
\`filipeta-icon-master.png\`

### 📏 Especificações:
- **Resolução:** 1024x1024px (mínimo 512x512)
- **Formato:** PNG com transparência
- **Qualidade:** Alta resolução, sem compressão
- **Design:** Clean, moderno, sem textos pequenos

### 🚀 Como usar:
\`\`\`bash
# 1. Coloque o ícone master nesta pasta
cp seu-icone-filipeta.png assets/source/filipeta-icon-master.png

# 2. Gere todos os formatos automaticamente
npm run generate-icons

# 3. Faça o build com os novos ícones
npm run dist
\`\`\`

### 📱 O que será gerado:
- **Windows:** icon.ico (múltiplos tamanhos)
- **macOS:** icon.icns (formato Apple)
- **Linux:** icon.png (512x512)
- **Retina:** icon@2x.png (1024x1024)

### 💡 Dicas de Design:
- Use cores da marca Filipeta
- Evite detalhes pequenos (não ficam visíveis em 16x16)
- Prefira formas simples e reconhecíveis
- Teste em diferentes tamanhos

---
Gerado pelo Filipeta Upgrade Manager v1.2.1+
`;
        
        fs.writeFileSync(readmePath, readmeContent);
        console.log('✅ Guia de ícones criado em assets/source/README.md');
        
        return true;
    }

    printUpgradeResults() {
        console.log('\n🎉 Upgrade da Filipeta Concluído!');
        console.log('══════════════════════════════════════════════════');
        
        console.log('\n✅ O QUE FOI FEITO:');
        console.log('   📦 package.json atualizado com novos scripts');
        console.log('   🔧 Dependências de automação instaladas');
        console.log('   📁 Estrutura de diretórios criada');
        console.log('   🎨 Sistema de ícones configurado');
        console.log('   📝 Configuração de versionamento criada');
        console.log('   ⚙️  Configurações de build melhoradas');
        
        console.log('\n🚀 PRÓXIMOS PASSOS:');
        console.log('\n1. 📥 BAIXAR OS SCRIPTS:');
        console.log('   Copie os arquivos dos scripts criados anteriormente para scripts/');
        console.log('   - auto-version.js');
        console.log('   - build-info.js');
        console.log('   - generate-icons.js');
        console.log('   - installer.nsh');
        
        console.log('\n2. 🎨 CONFIGURAR ÍCONE:');
        console.log('   - Coloque o ícone da Filipeta em: assets/source/filipeta-icon-master.png');
        console.log('   - Execute: npm run generate-icons');
        
        console.log('\n3. 🧪 TESTAR SISTEMA:');
        console.log('   npm run build-info     # Teste informações de build');
        console.log('   npm run auto-version   # Teste versionamento');
        console.log('   npm run dist-win       # Teste build Windows');
        
        console.log('\n📋 COMANDOS DISPONÍVEIS:');
        console.log('   npm run auto-version     # Versionamento automático');
        console.log('   npm run build-info       # Informações de build');
        console.log('   npm run generate-icons   # Gerar ícones');
        console.log('   npm run dist            # Build completo');
        console.log('   npm run dist-win        # Build Windows');
        console.log('   npm run release         # Release com changelog');
        
        console.log('\n💾 BACKUP:');
        console.log('   📁 Backup do package.json original: package.json.backup');
        console.log('   🔄 Para reverter: mv package.json.backup package.json');
        
        console.log('\n══════════════════════════════════════════════════');
        console.log('🎯 Filipeta v1.2.1+ com versionamento automático!');
        console.log('══════════════════════════════════════════════════\n');
    }

    async run() {
        console.log('🔧 Iniciando upgrade da Filipeta...\n');
        
        const steps = [
            { name: 'Verificar projeto', fn: () => this.verifyProject() },
            { name: 'Backup package.json', fn: () => this.backupCurrentPackage() },
            { name: 'Atualizar package.json', fn: () => this.updatePackageJson() },
            { name: 'Instalar dependências', fn: () => this.installDependencies() },
            { name: 'Criar estrutura', fn: () => this.createDirectoryStructure() },
            { name: 'Migrar assets', fn: () => this.migrateExistingAssets() },
            { name: 'Configurar versionamento', fn: () => this.createVersionrcConfig() },
            { name: 'Configurar ícones', fn: () => this.createIconPlaceholder() }
        ];
        
        for (const step of steps) {
            try {
                console.log(`\n🔄 ${step.name}...`);
                if (!step.fn()) {
                    console.error(`❌ Falha em: ${step.name}`);
                    return false;
                }
            } catch (error) {
                console.error(`❌ Erro em "${step.name}":`, error.message);
                return false;
            }
        }
        
        this.printUpgradeResults();
        return true;
    }
}

// Execução
if (require.main === module) {
    const upgrade = new FilipetaUpgrade();
    upgrade.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Erro fatal no upgrade:', error);
        process.exit(1);
    });
}

module.exports = FilipetaUpgrade;