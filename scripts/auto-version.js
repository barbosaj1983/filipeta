const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const semver = require('semver');

/**
 * Sistema de Versionamento Automático da Filipeta
 * Analisa mudanças no git e aplica semantic versioning
 */

class AutoVersionManager {
    constructor() {
        this.packagePath = path.join(process.cwd(), 'package.json');
        this.package = this.loadPackage();
        this.currentVersion = this.package.version;
        
        console.log('🚀 Filipeta Auto-Version Manager');
        console.log(`📦 Versão atual: ${this.currentVersion}`);
    }

    loadPackage() {
        try {
            return JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
        } catch (error) {
            console.error('❌ Erro ao ler package.json:', error.message);
            process.exit(1);
        }
    }

    savePackage() {
        try {
            fs.writeFileSync(this.packagePath, JSON.stringify(this.package, null, 2) + '\n');
            console.log(`✅ package.json atualizado para v${this.package.version}`);
        } catch (error) {
            console.error('❌ Erro ao salvar package.json:', error.message);
            process.exit(1);
        }
    }

    getGitChanges() {
        try {
            // Pega o último commit com tag de versão
            let lastTag;
            try {
                lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
            } catch {
                lastTag = execSync('git rev-list --max-parents=0 HEAD', { encoding: 'utf8' }).trim();
            }

            // Pega todos os commits desde a última tag
            const commits = execSync(`git log ${lastTag}..HEAD --oneline --no-merges`, { 
                encoding: 'utf8' 
            }).trim();

            if (!commits) {
                console.log('🔍 Nenhuma mudança desde a última versão');
                return { type: 'none', commits: [] };
            }

            return this.analyzeCommits(commits.split('\n'));
        } catch (error) {
            console.log('⚠️  Erro ao analisar git, assumindo mudanças patch');
            return { type: 'patch', commits: ['Mudanças detectadas'] };
        }
    }

    analyzeCommits(commits) {
        let versionType = 'patch'; // padrão
        const analysis = {
            breaking: [],
            features: [],
            fixes: [],
            others: []
        };

        commits.forEach(commit => {
            const message = commit.toLowerCase();
            
            // BREAKING CHANGES (major)
            if (message.includes('breaking') || 
                message.includes('major') || 
                message.includes('!:') ||
                message.match(/^(feat|fix|perf|refactor).*!:/)) {
                analysis.breaking.push(commit);
                versionType = 'major';
            }
            // FEATURES (minor) - apenas se realmente for uma nova funcionalidade
            else if (message.startsWith('feat:') || 
                     message.startsWith('feature:') ||
                     message.includes('nova funcionalidade') ||
                     message.includes('new feature') ||
                     message.includes('implementa nova')) {
                analysis.features.push(commit);
                if (versionType !== 'major') versionType = 'minor';
            }
            // FIXES (patch)
            else if (message.startsWith('fix:') || 
                     message.startsWith('bugfix:') ||
                     message.includes('correção') ||
                     message.includes('corrige bug') ||
                     message.includes('resolve bug')) {
                analysis.fixes.push(commit);
                // Mantém como patch (não muda versionType)
            }
            // OUTROS - analisa contexto
            else {
                analysis.others.push(commit);
                // Para "outros", só vira minor se for claramente uma funcionalidade
                if (message.includes('adiciona') && 
                    (message.includes('funcionalidade') || message.includes('feature'))) {
                    if (versionType !== 'major') versionType = 'minor';
                }
            }
        });

        // REMOVIDO: A lógica problemática de arquivos críticos
        // Agora analisa arquivos apenas para contexto, não para forçar versão
        try {
            const changedFiles = execSync('git diff --name-only HEAD~1', { encoding: 'utf8' }).trim();
            if (changedFiles) {
                const files = changedFiles.split('\n');
                
                // Log dos arquivos modificados para análise manual
                console.log(`📁 Arquivos modificados: ${files.length}`);
                const criticalFiles = files.filter(file => 
                    file.includes('main.js') ||
                    file.includes('preload.js') ||
                    file.includes('renderer.js') ||
                    file.includes('index.html')
                );
                
                if (criticalFiles.length > 0) {
                    console.log(`⚠️  Arquivos críticos modificados: ${criticalFiles.join(', ')}`);
                    console.log(`ℹ️  Considere se isso requer versão minor ou major`);
                }
                
                // REMOVIDO: Auto-increment para minor
                // if (criticalFiles.length > 0 && versionType === 'patch') {
                //     versionType = 'minor';
                // }
            }
        } catch (error) {
            // Ignora erro de análise de arquivos
        }

        return {
            type: versionType,
            commits: commits,
            analysis: analysis,
            summary: this.createSummary(analysis, versionType)
        };
    }

    createSummary(analysis, type) {
        const summary = [];
        
        if (analysis.breaking.length > 0) {
            summary.push(`🔥 ${analysis.breaking.length} breaking change(s)`);
        }
        if (analysis.features.length > 0) {
            summary.push(`✨ ${analysis.features.length} nova(s) feature(s)`);
        }
        if (analysis.fixes.length > 0) {
            summary.push(`🐛 ${analysis.fixes.length} correção(ões)`);
        }
        if (analysis.others.length > 0) {
            summary.push(`📝 ${analysis.others.length} outras mudanças`);
        }

        return summary.join(', ');
    }

    updateVersion(forceType = null) {
        const changes = this.getGitChanges();
        
        if (changes.type === 'none' && !forceType) {
            console.log('📋 Nenhuma atualização de versão necessária');
            return this.currentVersion;
        }

        // Permitir forçar tipo de versão via argumento
        const versionType = forceType || changes.type;
        const newVersion = semver.inc(this.currentVersion, versionType);
        
        console.log(`\n📊 Análise de mudanças:`);
        console.log(`   Tipo detectado: ${changes.type?.toUpperCase() || 'NONE'}`);
        console.log(`   Tipo aplicado: ${versionType.toUpperCase()}`);
        console.log(`   Resumo: ${changes.summary || 'Mudanças forçadas'}`);
        console.log(`   Commits analisados: ${changes.commits?.length || 0}`);
        console.log(`\n🔄 ${this.currentVersion} → ${newVersion}`);

        this.package.version = newVersion;
        this.savePackage();

        // Atualiza também o arquivo version.js se existir
        this.updateVersionFile(newVersion);

        // Cria tag git se estiver em um repositório
        this.createGitTag(newVersion);

        return newVersion;
    }

    updateVersionFile(version) {
        const versionFilePath = path.join(process.cwd(), 'version.js');
        try {
            const versionContent = `// Auto-generated version file
module.exports = {
    version: '${version}',
    buildDate: '${new Date().toISOString().split('T')[0]}',
    buildTimestamp: ${Date.now()}
};
`;
            fs.writeFileSync(versionFilePath, versionContent);
            console.log(`✅ version.js atualizado para v${version}`);
        } catch (error) {
            console.log('⚠️  version.js não foi atualizado:', error.message);
        }
    }

    createGitTag(version) {
        try {
            // Verifica se está em um repositório git
            execSync('git status', { stdio: 'ignore' });
            
            // Cria a tag
            execSync(`git tag -a v${version} -m "Release v${version}"`, { stdio: 'ignore' });
            console.log(`🏷️  Tag v${version} criada`);
            
            // Opcional: fazer commit da mudança de versão
            try {
                execSync('git add package.json version.js');
                execSync(`git commit -m "chore: bump version to ${version}"`);
                console.log(`📝 Commit de versão criado`);
            } catch (error) {
                console.log('⚠️  Commit automático não realizado');
            }
            
        } catch (error) {
            console.log('⚠️  Tag git não criada (não é um repositório git ou erro)');
        }
    }

    run(forceType = null) {
        console.log('\n🔍 Analisando mudanças...');
        
        // Verificar argumentos da linha de comando
        const args = process.argv.slice(2);
        if (args.length > 0) {
            const requestedType = args[0].toLowerCase();
            if (['patch', 'minor', 'major'].includes(requestedType)) {
                forceType = requestedType;
                console.log(`⚡ Forçando versão ${requestedType.toUpperCase()}`);
            }
        }
        
        const newVersion = this.updateVersion(forceType);
        
        console.log('\n🎉 Versionamento concluído!');
        console.log(`📦 Nova versão: ${newVersion}`);
        console.log('🚀 Pronto para build!\n');
        
        return newVersion;
    }
}

// Execução
if (require.main === module) {
    try {
        const versionManager = new AutoVersionManager();
        versionManager.run();
    } catch (error) {
        console.error('❌ Erro no versionamento:', error.message);
        process.exit(1);
    }
}

module.exports = AutoVersionManager;