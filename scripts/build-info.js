const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script para gerar informações detalhadas de build da Filipeta
 * Integrado com o sistema de versionamento automático
 */

class BuildInfoGenerator {
    constructor() {
        this.packagePath = path.join(process.cwd(), 'package.json');
        this.package = this.loadPackage();
        this.buildDate = new Date().toISOString().split('T')[0];
        this.buildTimestamp = Date.now();
        
        console.log('📋 Filipeta Build Info Generator');
    }

    loadPackage() {
        try {
            return JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
        } catch (error) {
            console.error('❌ Erro ao ler package.json:', error.message);
            process.exit(1);
        }
    }

    getGitInfo() {
        try {
            const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
            const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
            const commitLong = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
            const commitDate = execSync('git log -1 --format=%ci', { encoding: 'utf8' }).trim();
            const author = execSync('git log -1 --format=%an', { encoding: 'utf8' }).trim();
            
            // Verifica se há mudanças não commitadas
            let status = 'clean';
            try {
                const statusOutput = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
                if (statusOutput) status = 'dirty';
            } catch (error) {
                status = 'unknown';
            }

            return {
                branch,
                commit,
                commitLong,
                commitDate,
                author,
                status,
                repository: this.getRepositoryUrl()
            };
        } catch (error) {
            return {
                branch: 'unknown',
                commit: 'unknown',
                commitLong: 'unknown',
                commitDate: new Date().toISOString(),
                author: 'unknown',
                status: 'no-git',
                repository: null
            };
        }
    }

    getRepositoryUrl() {
        try {
            const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
            return remoteUrl;
        } catch (error) {
            return null;
        }
    }

    getSystemInfo() {
        const os = require('os');
        return {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            npmVersion: this.getNpmVersion(),
            electronVersion: this.getElectronVersion()
        };
    }

    getNpmVersion() {
        try {
            return execSync('npm --version', { encoding: 'utf8' }).trim();
        } catch (error) {
            return 'unknown';
        }
    }

    getElectronVersion() {
        try {
            const electronPackage = require('electron/package.json');
            return electronPackage.version;
        } catch (error) {
            return this.package.devDependencies?.electron || 'unknown';
        }
    }

    generateBuildInfo() {
        const gitInfo = this.getGitInfo();
        const systemInfo = this.getSystemInfo();
        
        const buildInfo = {
            // Informações do App
            app: {
                name: this.package.name,
                productName: this.package.build?.productName || this.package.name,
                version: this.package.version,
                description: this.package.description
            },
            
            // Build Information
            build: {
                date: this.buildDate,
                timestamp: this.buildTimestamp,
                iso: new Date().toISOString(),
                year: new Date().getFullYear()
            },
            
            // Git Information
            git: gitInfo,
            
            // System Information
            system: systemInfo,
            
            // Dependencies
            dependencies: {
                electron: systemInfo.electronVersion,
                node: systemInfo.nodeVersion.replace('v', ''),
                npm: systemInfo.npmVersion
            },
            
            // Metadata
            metadata: {
                generator: 'Filipeta Build Info Generator',
                generatedAt: new Date().toISOString(),
                buildId: this.generateBuildId(),
                environment: process.env.NODE_ENV || 'production'
            }
        };

        return buildInfo;
    }

    generateBuildId() {
        const gitInfo = this.getGitInfo();
        return `${this.package.version}-${gitInfo.commit}-${this.buildTimestamp.toString(36)}`;
    }

    saveBuildInfo(buildInfo) {
        // Salva como JSON
        const buildInfoPath = path.join(process.cwd(), 'build-info.json');
        fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
        
        // Salva como JS module
        const buildInfoJsPath = path.join(process.cwd(), 'build-info.js');
        const jsContent = `// Auto-generated build information
// Generated at: ${buildInfo.metadata.generatedAt}

module.exports = ${JSON.stringify(buildInfo, null, 2)};
`;
        fs.writeFileSync(buildInfoJsPath, jsContent);

        // Atualiza version.js com informações completas
        this.updateVersionFile(buildInfo);
        
        console.log(`✅ build-info.json criado`);
        console.log(`✅ build-info.js criado`);
        console.log(`✅ version.js atualizado`);
    }

    updateVersionFile(buildInfo) {
        const versionFilePath = path.join(process.cwd(), 'version.js');
        const versionContent = `// Auto-generated version file
// Build: ${buildInfo.metadata.buildId}

module.exports = {
    version: '${buildInfo.app.version}',
    buildDate: '${buildInfo.build.date}',
    buildTimestamp: ${buildInfo.build.timestamp},
    buildId: '${buildInfo.metadata.buildId}',
    commit: '${buildInfo.git.commit}',
    branch: '${buildInfo.git.branch}',
    
    // Compatibility with existing code
    getBuildInfo: () => (${JSON.stringify(buildInfo, null, 4)}),
    
    // Helper methods
    getVersionString: () => \`v\${module.exports.version} (\${module.exports.commit})\`,
    getBuildString: () => \`Build \${module.exports.buildId}\`,
    getFullVersionString: () => \`\${module.exports.getVersionString()} - \${module.exports.getBuildString()}\`
};
`;
        fs.writeFileSync(versionFilePath, versionContent);
    }

    printBuildSummary(buildInfo) {
        console.log('\n📋 Resumo do Build');
        console.log('═══════════════════════════════════════');
        console.log(`📦 App: ${buildInfo.app.productName}`);
        console.log(`🔢 Versão: ${buildInfo.app.version}`);
        console.log(`📅 Data: ${buildInfo.build.date}`);
        console.log(`🆔 Build ID: ${buildInfo.metadata.buildId}`);
        console.log(`🌿 Branch: ${buildInfo.git.branch}`);
        console.log(`📝 Commit: ${buildInfo.git.commit} (${buildInfo.git.status})`);
        console.log(`💻 Sistema: ${buildInfo.system.platform}/${buildInfo.system.arch}`);
        console.log(`⚡ Node.js: ${buildInfo.dependencies.node}`);
        console.log(`🖥️  Electron: ${buildInfo.dependencies.electron}`);
        console.log('═══════════════════════════════════════\n');
    }

    run() {
        console.log('\n🔍 Coletando informações de build...');
        
        const buildInfo = this.generateBuildInfo();
        this.saveBuildInfo(buildInfo);
        this.printBuildSummary(buildInfo);
        
        console.log('🎉 Informações de build geradas com sucesso!\n');
        
        return buildInfo;
    }
}

// Execução
if (require.main === module) {
    try {
        const buildInfoGenerator = new BuildInfoGenerator();
        buildInfoGenerator.run();
    } catch (error) {
        console.error('❌ Erro ao gerar build info:', error.message);
        process.exit(1);
    }
}

module.exports = BuildInfoGenerator;