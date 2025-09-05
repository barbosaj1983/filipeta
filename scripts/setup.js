const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script de setup completo para o projeto Filipeta
 * Configura versionamento, ícones e build automatizado
 */

class FilipetaSetup {
    constructor() {
        this.projectRoot = process.cwd();
        this.scriptsDir = path.join(this.projectRoot, 'scripts');
        this.assetsDir = path.join(this.projectRoot, 'assets');
        
        console.log('🚀 Filipeta Setup Manager');
        console.log(`📁 Projeto: ${this.projectRoot}`);
    }

    checkProjectStructure() {
        console.log('\n📋 Verificando estrutura do projeto...');
        
        const requiredFiles = [
            'package.json',
            'main.js',
            'preload.js',
            'renderer.js',
            'index.html'
        ];
        
        const missingFiles = requiredFiles.filter(file => 
            !fs.existsSync(path.join(this.projectRoot, file))
        );
        
        if (missingFiles.length > 0) {
            console.log('⚠️  Arquivos não encontrados:');
            missingFiles.forEach(file => console.log(`   - ${file}`));
            console.log('💡 Certifique-se de estar na raiz do projeto Filipeta');
            return false;
        }
        
        console.log('✅ Estrutura do projeto OK');
        return true;
    }

    installDependencies() {
        console.log('\n📦 Instalando dependências...');
        
        const devDeps = [
            'electron-builder@^24.0.0',
            'standard-version@^9.5.0',
            'conventional-changelog-cli@^4.1.0',
            'semver@^7.5.4',
            'sharp@^0.33.0'
        ];
        
        try {
            console.log('📥 Instalando dependências de desenvolvimento...');
            execSync(`npm install --save-dev ${devDeps.join(' ')}`, { 
                stdio: 'inherit',
                cwd: this.projectRoot 
            });
            console.log('✅ Dependências instaladas com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao instalar dependências:', error.message);
            return false;
        }
    }

    createDirectoryStructure() {
        console.log('\n📁 Criando estrutura de diretórios...');
        
        const dirs = [
            'scripts',
            'assets',
            'assets/icons',
            'assets/images',
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

    updatePackageJson() {
        console.log('\n📝 Atualizando package.json...');
        
        try {
            const packagePath = path.join(this.projectRoot, 'package.json');
            const package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            // Atualizar scripts
            const newScripts = {
                'auto-version': 'node scripts/auto-version.js',
                'build-info': 'node scripts/build-info.js',
                'generate-icons': 'node scripts/generate-icons.js',
                'version': 'npm run auto-version && npm run build-info',
                'prepack': 'npm run version',
                'dist': 'npm run version && electron-builder',
                'dist-win': 'npm run version && electron-builder --win',
                'dist-mac': 'npm run version && electron-builder --mac',
                'dist-linux': 'npm run version && electron-builder --linux',
                'release': 'standard-version',
                'release:minor': 'standard-version --release-as minor',
                'release:major': 'standard-version --release-as major',
                'release:patch': 'standard-version --release-as patch',
                'setup': 'node scripts/setup.js'
            };
            
            package.scripts = { ...package.scripts, ...newScripts };
            
            // Configuração do electron-builder se não existir
            if (!package.build) {
                package.build = {
                    "appId": "com.filipeta.assistente-balcao",
                    "productName": "Filipeta - Assistente de Balcão",
                    "copyright": "Copyright © 2025 Filipeta",
                    "directories": {
                        "output": "dist"
                    },
                    "win": {
                        "target": "nsis",
                        "icon": "assets/icons/icon.ico"
                    },
                    "mac": {
                        "target": "dmg",
                        "icon": "assets/icons/icon.icns",
                        "category": "public.app-category.business"
                    },
                    "linux": {
                        "target": "AppImage",
                        "icon": "assets/icons/icon.png",
                        "category": "Office"
                    },
                    "nsis": {
                        "oneClick": false,
                        "allowElevation": true,
                        "allowToChangeInstallationDirectory": true,
                        "createDesktopShortcut": true,
                        "createStartMenuShortcut": true,
                        "shortcutName": "Filipeta",
                        "include": "scripts/installer.nsh"
                    }
                };
            }
            
            fs.writeFileSync(packagePath, JSON.stringify(package, null, 2) + '\n');
            console.log('✅ package.json atualizado');
            return true;
        } catch (error) {
            console.error('❌ Erro ao atualizar package.json:', error.message);
            return false;
        }
    }

    createGitHooks() {
        console.log('\n🪝 Configurando Git hooks...');
        
        try {
            // Verificar se é um repositório git
            execSync('git status', { stdio: 'ignore' });
            
            const hooksDir = path.join(this.projectRoot, '.git', 'hooks');
            
            // Pre-commit hook
            const preCommitContent = `#!/bin/sh
# Filipeta pre-commit hook
# Auto-gera build info antes do commit

echo "🔍 Filipeta: Gerando build info..."
npm run build-info

# Adicionar arquivos gerados se existirem
if [ -f "build-info.json" ]; then
    git add build-info.json
fi

if [ -f "version.js" ]; then
    git add version.js
fi

echo "✅ Build info atualizado"
`;
            
            const preCommitPath = path.join(hooksDir, 'pre-commit');
            fs.writeFileSync(preCommitPath, preCommitContent);
            
            // Tornar executável (Linux/Mac)
            try {
                execSync(`chmod +x "${preCommitPath}"`);
            } catch (error) {
                // Ignora erro no Windows
            }
            
            console.log('✅ Git hooks configurados');
            return true;
        } catch (error) {
            console.log('⚠️  Git hooks não configurados (não é um repo git)');
            return false;
        }
    }

    createIconPlaceholder() {
        console.log('\n🎨 Criando placeholder para ícones...');
        
        const readmePath = path.join(this.assetsDir, 'source', 'README.md');
        const readmeContent = `# Ícones da Filipeta

## 📥 Para Configurar os Ícones:

1. **Coloque o ícone master aqui:**
   - Nome: \`filipeta-icon-master.png\`
   - Tamanho: 1024x1024px (mínimo 512x512)
   - Formato: PNG com transparência
   - Qualidade: Alta resolução

2. **Execute o gerador:**
   \`\`\`bash
   npm run generate-icons
   \`\`\`

3. **Resultado:**
   - \`assets/icons/icon.ico\` (Windows)
   - \`assets/icons/icon.icns\` (macOS)  
   - \`assets/icons/icon.png\` (Linux)
   - E vários outros tamanhos

## 🎨 Diretrizes de Design:

- **Tema:** Assistente/Balcão de vendas
- **Estilo:** Moderno, clean, profissional
- **Cores:** Paleta da marca Filipeta
- **Elementos:** Evitar textos pequenos (não ficam legíveis em 16x16)

## 📱 Tamanhos Gerados:

- 16x16, 32x32, 48x48, 64x64, 128x128, 256x256, 512x512, 1024x1024
- Formatos: PNG, ICO, ICNS
- Otimizados para cada plataforma

## 🔧 Troubleshooting:

Se houver problemas na geração:
1. Instale Sharp: \`npm install sharp\`
2. Ou instale ImageMagick
3. Certifique-se que o ícone master está no local correto
`;
        
        fs.writeFileSync(readmePath, readmeContent);
        console.log('✅ Placeholder de ícones criado');
        
        // Criar exemplo de ícone simples se não existir
        const masterIconPath = path.join(this.assetsDir, 'source', 'filipeta-icon-master.png');
        if (!fs.existsSync(masterIconPath)) {
            console.log('💡 Coloque seu ícone master em: assets/source/filipeta-icon-master.png');
        }
        
        return true;
    }

    createConventionalCommitsConfig() {
        console.log('\n📝 Configurando Conventional Commits...');
        
        const versionrcContent = {
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
            "releaseCommitMessageFormat": "chore(release): {{currentTag}}",
            "commitUrlFormat": "{{host}}/{{owner}}/{{repository}}/commit/{{hash}}",
            "compareUrlFormat": "{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}"
        };
        
        fs.writeFileSync(
            path.join(this.projectRoot, '.versionrc.json'),
            JSON.stringify(versionrcContent, null, 2)
        );
        
        console.log('✅ Configuração de versionamento criada');
        return true;
    }

    printInstructions() {
        console.log('\n🎉 Setup da Filipeta concluído!');
        console.log('═══════════════════════════════════════════════════');
        
        console.log('\n📋 PRÓXIMOS PASSOS:');
        console.log('\n1. 🎨 CONFIGURAR ÍCONES:');
        console.log('   - Coloque o ícone master em: assets/source/filipeta-icon-master.png');
        console.log('   - Execute: npm run generate-icons');
        
        console.log('\n2. 🏗️  TESTE O BUILD:');
        console.log('   - Execute: npm run build-info');
        console.log('   - Execute: npm run dist');
        
        console.log('\n3. 📦 COMANDOS DISPONÍVEIS:');
        console.log('   npm run auto-version     # Versionamento automático');
        console.log('   npm run build-info       # Gerar informações de build');
        console.log('   npm run generate-icons   # Gerar ícones para todas plataformas');
        console.log('   npm run dist             # Build completo com versionamento');
        console.log('   npm run dist-win         # Build só para Windows');
        console.log('   npm run dist-mac         # Build só para macOS');
        console.log('   npm run dist-linux       # Build só para Linux');
        
        console.log('\n4. 📈 VERSIONAMENTO:');
        console.log('   npm run release          # Release automático (patch)');
        console.log('   npm run release:minor    # Release minor');
        console.log('   npm run release:major    # Release major');
        
        console.log('\n5. 💡 DICAS:');
        console.log('   - Use conventional commits (feat:, fix:, etc.)');
        console.log('   - O versionamento é automático baseado nos commits');
        console.log('   - Ícones são gerados automaticamente antes do build');
        console.log('   - Build info é atualizado a cada build');
        
        console.log('\n═══════════════════════════════════════════════════');
        console.log('🚀 Filipeta está pronto para produção!');
        console.log('═══════════════════════════════════════════════════\n');
    }

    async run() {
        console.log('🔧 Iniciando setup da Filipeta...\n');
        
        const steps = [
            { name: 'Verificar projeto', fn: () => this.checkProjectStructure() },
            { name: 'Criar estrutura', fn: () => this.createDirectoryStructure() },
            { name: 'Instalar dependências', fn: () => this.installDependencies() },
            { name: 'Atualizar package.json', fn: () => this.updatePackageJson() },
            { name: 'Configurar versionamento', fn: () => this.createConventionalCommitsConfig() },
            { name: 'Configurar Git hooks', fn: () => this.createGitHooks() },
            { name: 'Configurar ícones', fn: () => this.createIconPlaceholder() }
        ];
        
        let success = true;
        
        for (const step of steps) {
            try {
                if (!step.fn()) {
                    success = false;
                    break;
                }
            } catch (error) {
                console.error(`❌ Erro em "${step.name}":`, error.message);
                success = false;
                break;
            }
        }
        
        if (success) {
            this.printInstructions();
        } else {
            console.log('\n❌ Setup não concluído. Verifique os erros acima.');
        }
        
        return success;
    }
}

// Execução
if (require.main === module) {
    const setup = new FilipetaSetup();
    setup.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Erro fatal no setup:', error);
        process.exit(1);
    });
}

module.exports = FilipetaSetup;