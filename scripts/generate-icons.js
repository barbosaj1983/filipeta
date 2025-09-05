const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Gerador automático de ícones para todas as plataformas da Filipeta
 * Converte um ícone master para todos os formatos necessários
 */

class IconGenerator {
    constructor() {
        this.projectRoot = process.cwd();
        this.assetsDir = path.join(this.projectRoot, 'assets');
        this.iconsDir = path.join(this.assetsDir, 'icons');
        this.sourceDir = path.join(this.assetsDir, 'source');
        this.masterIconPath = path.join(this.sourceDir, 'filipeta-icon-master.png');
        
        console.log('🎨 Filipeta Icon Generator');
        console.log(`📁 Assets: ${this.assetsDir}`);
    }

    checkDependencies() {
        const dependencies = [];
        
        // Verifica Sharp (melhor opção)
        try {
            require('sharp');
            console.log('✅ Sharp detectado - usando para conversão');
            return 'sharp';
        } catch (error) {
            dependencies.push('sharp');
        }

        // Verifica ImageMagick
        try {
            execSync('convert --version', { stdio: 'ignore' });
            console.log('✅ ImageMagick detectado - usando para conversão');
            return 'imagemagick';
        } catch (error) {
            dependencies.push('imagemagick');
        }

        console.log('❌ Dependências não encontradas:');
        console.log('   Para melhor qualidade, instale Sharp: npm install sharp');
        console.log('   Alternativamente, instale ImageMagick: https://imagemagick.org/');
        
        return null;
    }

    checkMasterIcon() {
        if (!fs.existsSync(this.masterIconPath)) {
            console.log('❌ Ícone master não encontrado!');
            console.log(`📍 Coloque o ícone em: ${this.masterIconPath}`);
            console.log('📏 Resolução recomendada: 1024x1024px ou maior');
            console.log('🎨 Formato: PNG com transparência');
            return false;
        }

        console.log(`✅ Ícone master encontrado: ${this.masterIconPath}`);
        return true;
    }

    ensureDirectories() {
        const dirs = [this.assetsDir, this.iconsDir, this.sourceDir];
        
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Criado diretório: ${dir}`);
            }
        });
    }

    async generateWithSharp() {
        const sharp = require('sharp');
        
        console.log('\n🔄 Gerando ícones com Sharp...');
        
        // Definir tamanhos necessários
        const iconSizes = {
            'icon.png': 512,          // Linux
            'icon@2x.png': 1024,      // Retina
            'icon-16.png': 16,        // Windows ICO components
            'icon-32.png': 32,
            'icon-48.png': 48,
            'icon-64.png': 64,
            'icon-128.png': 128,
            'icon-256.png': 256,
            'icon-512.png': 512
        };

        // Gerar PNGs individuais
        for (const [filename, size] of Object.entries(iconSizes)) {
            const outputPath = path.join(this.iconsDir, filename);
            
            await sharp(this.masterIconPath)
                .resize(size, size, {
                    kernel: sharp.kernel.lanczos3,
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png({ quality: 100, compressionLevel: 0 })
                .toFile(outputPath);
                
            console.log(`✅ ${filename} (${size}x${size})`);
        }

        // Gerar ICO para Windows (combinando múltiplos tamanhos)
        await this.generateWindowsICO();
        
        // Gerar ICNS para macOS
        await this.generateMacOSICNS();
        
        console.log('✅ Todos os ícones gerados com Sharp!');
    }

    generateWithImageMagick() {
        console.log('\n🔄 Gerando ícones com ImageMagick...');
        
        const iconSizes = [16, 32, 48, 64, 128, 256, 512, 1024];
        
        // Gerar PNGs individuais
        iconSizes.forEach(size => {
            const outputPath = path.join(this.iconsDir, `icon-${size}.png`);
            const command = `convert "${this.masterIconPath}" -resize ${size}x${size} "${outputPath}"`;
            
            try {
                execSync(command, { stdio: 'ignore' });
                console.log(`✅ icon-${size}.png`);
            } catch (error) {
                console.log(`❌ Erro ao gerar icon-${size}.png`);
            }
        });

        // Ícone principal Linux
        const linuxIconPath = path.join(this.iconsDir, 'icon.png');
        execSync(`convert "${this.masterIconPath}" -resize 512x512 "${linuxIconPath}"`);
        console.log('✅ icon.png (Linux)');

        // Ícone Retina
        const retinaIconPath = path.join(this.iconsDir, 'icon@2x.png');
        execSync(`convert "${this.masterIconPath}" -resize 1024x1024 "${retinaIconPath}"`);
        console.log('✅ icon@2x.png (Retina)');

        // Gerar ICO para Windows
        this.generateWindowsICOWithImageMagick();
        
        // Tentar gerar ICNS (requer macOS)
        this.tryGenerateMacOSICNS();
        
        console.log('✅ Ícones gerados com ImageMagick!');
    }

    async generateWindowsICO() {
        console.log('🪟 Gerando icon.ico para Windows...');
        
        try {
            const sharp = require('sharp');
            
            // Para ICO, vamos usar ImageMagick se disponível (melhor suporte)
            const sizes = [16, 32, 48, 64, 128, 256];
            const tempFiles = [];
            
            // Gerar arquivos temporários
            for (const size of sizes) {
                const tempFile = path.join(this.iconsDir, `temp-${size}.png`);
                await sharp(this.masterIconPath)
                    .resize(size, size, { kernel: sharp.kernel.lanczos3 })
                    .png()
                    .toFile(tempFile);
                tempFiles.push(tempFile);
            }
            
            // Usar ImageMagick para combinar em ICO
            try {
                const icoPath = path.join(this.iconsDir, 'icon.ico');
                const command = `convert ${tempFiles.join(' ')} "${icoPath}"`;
                execSync(command, { stdio: 'ignore' });
                console.log('✅ icon.ico gerado');
            } catch (error) {
                console.log('⚠️  icon.ico não pôde ser gerado (ImageMagick necessário)');
                // Copia o PNG 256 como fallback
                const fallbackPath = path.join(this.iconsDir, 'icon.ico');
                fs.copyFileSync(path.join(this.iconsDir, 'icon-256.png'), fallbackPath);
                console.log('📋 Usando PNG 256x256 como fallback');
            }
            
            // Limpar arquivos temporários
            tempFiles.forEach(file => {
                if (fs.existsSync(file)) fs.unlinkSync(file);
            });
            
        } catch (error) {
            console.log('❌ Erro ao gerar ICO:', error.message);
        }
    }

    generateWindowsICOWithImageMagick() {
        console.log('🪟 Gerando icon.ico para Windows...');
        
        try {
            const icoPath = path.join(this.iconsDir, 'icon.ico');
            const sizes = [16, 32, 48, 64, 128, 256];
            const sizeArgs = sizes.map(size => `\\( "${this.masterIconPath}" -resize ${size}x${size} \\)`).join(' ');
            
            const command = `convert ${sizeArgs} "${icoPath}"`;
            execSync(command, { stdio: 'ignore' });
            console.log('✅ icon.ico gerado');
        } catch (error) {
            console.log('❌ Erro ao gerar ICO com ImageMagick');
        }
    }

    async generateMacOSICNS() {
        console.log('🍎 Gerando icon.icns para macOS...');
        
        try {
            // Criar iconset directory
            const iconsetDir = path.join(this.iconsDir, 'icon.iconset');
            if (fs.existsSync(iconsetDir)) {
                fs.rmSync(iconsetDir, { recursive: true });
            }
            fs.mkdirSync(iconsetDir);

            const sharp = require('sharp');
            
            // Definir mapeamento de arquivos ICNS
            const icnsMap = {
                'icon_16x16.png': 16,
                'icon_16x16@2x.png': 32,
                'icon_32x32.png': 32,
                'icon_32x32@2x.png': 64,
                'icon_128x128.png': 128,
                'icon_128x128@2x.png': 256,
                'icon_256x256.png': 256,
                'icon_256x256@2x.png': 512,
                'icon_512x512.png': 512,
                'icon_512x512@2x.png': 1024
            };

            // Gerar cada arquivo do iconset
            for (const [filename, size] of Object.entries(icnsMap)) {
                const outputPath = path.join(iconsetDir, filename);
                
                await sharp(this.masterIconPath)
                    .resize(size, size, { kernel: sharp.kernel.lanczos3 })
                    .png()
                    .toFile(outputPath);
            }

            // Tentar converter para ICNS (só funciona no macOS)
            try {
                const icnsPath = path.join(this.iconsDir, 'icon.icns');
                execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, { stdio: 'ignore' });
                console.log('✅ icon.icns gerado');
                
                // Limpar iconset
                fs.rmSync(iconsetDir, { recursive: true });
            } catch (error) {
                console.log('⚠️  icon.icns não pôde ser gerado (requer macOS)');
                console.log(`📁 Iconset criado em: ${iconsetDir}`);
                console.log('💡 Execute no macOS: iconutil -c icns icon.iconset');
            }

        } catch (error) {
            console.log('❌ Erro ao gerar ICNS:', error.message);
        }
    }

    tryGenerateMacOSICNS() {
        console.log('🍎 Tentando gerar icon.icns para macOS...');
        
        // Esta funcionalidade só funciona completamente no macOS
        console.log('⚠️  Geração de ICNS requer macOS');
        console.log('💡 No macOS, use: iconutil -c icns icon.iconset');
    }

    generateManifests() {
        console.log('\n📋 Gerando manifestos...');
        
        // Gerar lista de ícones gerados
        const iconList = fs.readdirSync(this.iconsDir)
            .filter(file => file.endsWith('.png') || file.endsWith('.ico') || file.endsWith('.icns'))
            .map(file => {
                const filePath = path.join(this.iconsDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: stats.size,
                    modified: stats.mtime
                };
            });

        const manifest = {
            generated: new Date().toISOString(),
            source: this.masterIconPath,
            icons: iconList,
            total: iconList.length
        };

        fs.writeFileSync(
            path.join(this.iconsDir, 'icons-manifest.json'),
            JSON.stringify(manifest, null, 2)
        );

        console.log(`✅ Manifesto criado (${iconList.length} ícones)`);
    }

    printSummary() {
        const icons = fs.readdirSync(this.iconsDir)
            .filter(file => file.endsWith('.png') || file.endsWith('.ico') || file.endsWith('.icns'));

        console.log('\n🎉 Geração de ícones concluída!');
        console.log('═══════════════════════════════════════');
        console.log(`📁 Diretório: ${this.iconsDir}`);
        console.log(`📦 Total de ícones: ${icons.length}`);
        console.log('\n🔍 Arquivos gerados:');
        
        icons.forEach(icon => {
            const filePath = path.join(this.iconsDir, icon);
            const stats = fs.statSync(filePath);
            const sizeKB = Math.round(stats.size / 1024);
            console.log(`   ${icon.padEnd(20)} (${sizeKB} KB)`);
        });

        console.log('\n✅ Pronto para usar no electron-builder!');
        console.log('═══════════════════════════════════════\n');
    }

    async run() {
        console.log('\n🎨 Iniciando geração de ícones da Filipeta...');
        
        this.ensureDirectories();
        
        if (!this.checkMasterIcon()) {
            return false;
        }

        const converter = this.checkDependencies();
        if (!converter) {
            return false;
        }

        try {
            if (converter === 'sharp') {
                await this.generateWithSharp();
            } else {
                this.generateWithImageMagick();
            }

            this.generateManifests();
            this.printSummary();
            
            return true;
        } catch (error) {
            console.error('❌ Erro durante a geração:', error.message);
            return false;
        }
    }
}

// Execução
if (require.main === module) {
    const iconGenerator = new IconGenerator();
    iconGenerator.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    });
}

module.exports = IconGenerator;