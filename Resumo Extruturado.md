📘 Resumo Estruturado – Projeto Filipeta Assistente de Balcão
🏗️ Visão Geral

Nome do App: assistente-balcao

Produto: Filipeta Assistente de Balcão

Versão Atual: 1.8.0

Descrição: Sistema de apoio ao balconista, em formato filipeta lateral, que recomenda produtos baseados em CPF (histórico de compras) e EAN (produto consultado).

Tecnologias Principais:

Frontend/Desktop: Electron + HTML/CSS/JS

Backend: Node.js + Express (BFF)

Banco: PostgreSQL (Neon.tech)

Cache: TTL em memória

Versionamento: SemVer + scripts automáticos

Build/Empacotamento: Electron Builder

📂 Estrutura do Projeto
C:\FILIPETA
 ├── main.js                # Processo principal do Electron
 ├── preload.js             # IPC entre renderer e main
 ├── preload-popup.js       # IPC para popup de uso contínuo
 ├── renderer.js            # Lógica de UI e integração frontend
 ├── index.html             # Interface principal
 ├── popup.html             # Interface de uso contínuo
 ├── config.json            # Configurações gerais
 ├── package.json           # Metadados e scripts do app
 ├── package-lock.json
 ├── db.js                  # Conexão PostgreSQL
 ├── cache.js               # Cache TTL
 ├── routes.js              # Rotas Express API
 ├── index.js               # Servidor BFF
 ├── schema.sql             # Estrutura do banco
 ├── build-info.js / .json  # Metadados de build
 ├── auto-version.js        # Versionamento automático
 ├── update-version.js      # Atualizador de version.js
 ├── update-html-version.js # Substitui versões hardcoded em HTML
 ├── upgrade-filipeta.js    # Upgrade manager
 ├── generate-icons.js      # Geração de ícones multi-plataforma
 ├── setup.js               # Setup inicial do projeto
 ├── assets/                # Ícones, imagens e fontes
 └── dist/                  # Builds gerados (exe, config, etc.)

🗄️ Banco de Dados (PostgreSQL/Neon)
Tabelas Principais

clientes – CPF, nome, data de criação

produtos – EAN, nome, categoria, preço

compras – CPF, data, valor total, loja

itens_compra – ligação compra ↔ produto

produto_relacionado – pares de EANs + métricas (lift, confidence)

Objetivo:

Permitir recomendações automáticas:

Histórico por CPF

Produtos mais consumidos

Itens comprados juntos

Relacionamentos (MBA + Word2Vec futuro)

⚙️ Backend (BFF – assistente-balcao-bff)

Framework: Express + Pino + Helmet + CORS

Arquivo principal: src/index.js

Rotas: routes.js

Integrações:

PostgreSQL (db.js) com Pool/SSL

Cache TTL (cache.js)

Dependências chave:

express, pg, dotenv, helmet, pino, zod

🖥️ Frontend / Electron
Componentes

main.js – cria janelas, integra DB e popup

preload.js – expõe APIs DB ao renderer

renderer.js – manipula DOM, CPF/EAN, exibe recomendações

popup.html + preload-popup.js – fluxo de uso contínuo

Estilo (Neuro-UX)

Base fria (navy/slate) → confiança/credibilidade

Azul → cognição/novidade (recomendados)

Verde → continuidade/reforço (mais consumidos)

Violeta → integração/associação (vendidos juntos)

CTA vermelho → desejo/ação

🔄 Versionamento e Build

auto-version.js → lê git e aplica SemVer

build-info.js → gera metadados (branch, commit, autor, status git)

update-version.js → atualiza version.js com data e build

update-html-version.js → sincroniza HTMLs

upgrade-filipeta.js → migração para v1.2.1+

generate-icons.js → gera ícones .ico/.png para Windows, Linux, Mac

setup.js → instala dependências e valida estrutura

Dist: empacotado em .exe pelo electron-builder

🔑 Configurações e Env

.env / .env.example

DATABASE_URL (Postgres Neon)

PGSSLMODE=require

PORT=8080

config.json → parâmetros do app

build-info.json → snapshot de build

🚀 Próximos Passos Possíveis

IA Avançada: integrar Word2Vec/XGBoost para recomendações personalizadas.

Autonomia Comercial: permitir que atendente iniciante tenha performance de especialista.

Monitoramento: log centralizado (Pino) + métricas SQL lentas.

Features Futuras:

Multi-loja (ainda desativado)

Analytics em tempo real

Integração com WhatsApp/Telegram para consulta remota