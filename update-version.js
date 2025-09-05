#!/usr/bin/env node
// update-version.js - Sistema de versionamento automático
const fs = require('fs');
const path = require('path');

// Cores para output no console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getCurrentDate() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getBuildNumber() {
  const now = new Date();
  return now.getFullYear().toString() + 
         (now.getMonth() + 1).toString().padStart(2, '0') + 
         now.getDate().toString().padStart(2, '0') + 
         now.getHours().toString().padStart(2, '0') + 
         now.getMinutes().toString().padStart(2, '0');
}

function updateVersionJs(versionType, currentVersion) {
  const versionPath = path.join(__dirname, 'version.js');
  
  if (!fs.existsSync(versionPath)) {
    log('❌ Arquivo version.js não encontrado!', 'red');
    process.exit(1);
  }

  let content = fs.readFileSync(versionPath, 'utf8');
  
  // Calcular nova versão
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  let newVersion;
  
  switch (versionType) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }

  const newBuildDate = getCurrentDate();
  const newBuildNumber = getBuildNumber();

  // Atualizar version.js
  content = content.replace(/MAJOR:\s*\d+/, `MAJOR: ${newVersion.split('.')[0]}`);
  content = content.replace(/MINOR:\s*\d+/, `MINOR: ${newVersion.split('.')[1]}`);
  content = content.replace(/PATCH:\s*\d+/, `PATCH: ${newVersion.split('.')[2]}`);
  content = content.replace(/BUILD_DATE:\s*'[^']*'/, `BUILD_DATE: '${newBuildDate}'`);
  content = content.replace(/BUILD_NUMBER:\s*'[^']*'/, `BUILD_NUMBER: '${newBuildNumber}'`);

  fs.writeFileSync(versionPath, content);
  
  return { newVersion, newBuildDate, newBuildNumber };
}

function updatePackageJson(newVersion) {
  const packagePath = path.join(__dirname, 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    log('❌ Arquivo package.json não encontrado!', 'red');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.version = newVersion;
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
}

function updateMainJs(newVersion) {
  const mainPath = path.join(__dirname, 'main.js');
  
  if (!fs.existsSync(mainPath)) {
    log('⚠️ Arquivo main.js não encontrado, pulando atualização', 'yellow');
    return;
  }

  let content = fs.readFileSync(mainPath, 'utf8');
  
  // Procurar por versão no main.js e atualizar
  content = content.replace(/APP_VERSION\s*=\s*'[^']*'/, `APP_VERSION = '${newVersion}'`);
  content = content.replace(/const APP_VERSION = '[^']*'/, `const APP_VERSION = '${newVersion}'`);
  
  fs.writeFileSync(mainPath, content);
}

function generateChangelog(versionType, newVersion) {
  const changelogPath = path.join(__dirname, 'CHANGELOG.md');
  const date = getCurrentDate();
  
  let changelogEntry = `\n## [${newVersion}] - ${date}\n\n`;
  
  switch (versionType) {
    case 'major':
      changelogEntry += `### 🚀 BREAKING CHANGES\n`;
      changelogEntry += `- Nova versão principal com mudanças significativas\n`;
      changelogEntry += `- Possíveis incompatibilidades com versões anteriores\n\n`;
      break;
    case 'minor':
      changelogEntry += `### ✨ Novas Funcionalidades\n`;
      changelogEntry += `- Novas funcionalidades adicionadas\n`;
      changelogEntry += `- Melhorias na experiência do usuário\n\n`;
      break;
    case 'patch':
    default:
      changelogEntry += `### 🐛 Correções\n`;
      changelogEntry += `- Correções de bugs e melhorias de estabilidade\n`;
      changelogEntry += `- Otimizações de performance\n\n`;
      break;
  }
  
  if (fs.existsSync(changelogPath)) {
    const existingChangelog = fs.readFileSync(changelogPath, 'utf8');
    const updatedChangelog = existingChangelog.replace('# Changelog\n', `# Changelog\n${changelogEntry}`);
    fs.writeFileSync(changelogPath, updatedChangelog);
  } else {
    const newChangelog = `# Changelog\n\nTodas as mudanças notáveis deste projeto serão documentadas neste arquivo.\n${changelogEntry}`;
    fs.writeFileSync(changelogPath, newChangelog);
  }
}

function main() {
  log('\n🚀 FILIPETA - Sistema de Versionamento Automático', 'cyan');
  log('=' .repeat(50), 'blue');
  
  // Obter tipo de versão dos argumentos
  const versionType = process.argv[2] || 'patch';
  
  if (!['major', 'minor', 'patch'].includes(versionType)) {
    log('❌ Tipo de versão inválido. Use: major, minor ou patch', 'red');
    process.exit(1);
  }

  // Ler versão atual do version.js
  let currentVersion = '1.2.0'; // fallback
  try {
    const versionContent = fs.readFileSync(path.join(__dirname, 'version.js'), 'utf8');
    const majorMatch = versionContent.match(/MAJOR:\s*(\d+)/);
    const minorMatch = versionContent.match(/MINOR:\s*(\d+)/);
    const patchMatch = versionContent.match(/PATCH:\s*(\d+)/);
    
    if (majorMatch && minorMatch && patchMatch) {
      currentVersion = `${majorMatch[1]}.${minorMatch[1]}.${patchMatch[1]}`;
    }
  } catch (error) {
    log('⚠️ Erro ao ler versão atual, usando fallback', 'yellow');
  }

  log(`📋 Versão atual: ${currentVersion}`, 'yellow');
  log(`📈 Tipo de atualização: ${versionType.toUpperCase()}`, 'blue');
  
  // Atualizar arquivos
  log('\n🔄 Atualizando arquivos...', 'cyan');
  
  const { newVersion, newBuildDate, newBuildNumber } = updateVersionJs(versionType, currentVersion);
  log(`✅ version.js atualizado`, 'green');
  
  updatePackageJson(newVersion);
  log(`✅ package.json atualizado`, 'green');
  
  updateMainJs(newVersion);
  log(`✅ main.js atualizado`, 'green');
  
  generateChangelog(versionType, newVersion);
  log(`✅ CHANGELOG.md atualizado`, 'green');
  
  // Resumo
  log('\n📊 RESUMO DA ATUALIZAÇÃO', 'magenta');
  log('=' .repeat(30), 'blue');
  log(`🏷️  Nova versão: ${newVersion}`, 'bright');
  log(`📅 Data do build: ${newBuildDate}`, 'bright');
  log(`🔢 Número do build: ${newBuildNumber}`, 'bright');
  
  log('\n✅ Versionamento concluído com sucesso!', 'green');
  log('🚀 Pronto para executar npm run build-info && npm run dist', 'cyan');
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { updateVersionJs, updatePackageJson, updateMainJs, generateChangelog };