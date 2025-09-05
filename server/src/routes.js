import { query } from '../db.js';

/**
 * Diagnóstico específico para relacionamentos bidirecionais
 * Uso: node scripts/debug-bidirectional.js 7500435154260
 */

const ean = process.argv[2];

if (!ean) {
  console.log('Uso: node debug-bidirectional.js <EAN>');
  process.exit(1);
}

async function diagnosticarBidirecionais(eanInput) {
  console.log(`Diagnosticando relacionamentos bidirecionais para EAN: ${eanInput}`);
  
  try {
    // 1. Buscar todos os relacionamentos na tabela (ambas direções)
    console.log('\n=== RELACIONAMENTOS RAW NA TABELA ===');
    
    const rawQuery = `
      SELECT 
        produto_ean,
        relacionado_ean,
        produto_nome,
        relacionado_nome,
        lift,
        confidence
      FROM produto_relacionado
      WHERE REGEXP_REPLACE(produto_ean,'\\D','','g') = $1
         OR REGEXP_REPLACE(relacionado_ean,'\\D','','g') = $1
      ORDER BY lift DESC, confidence DESC
    `;

    const rawResults = await query(rawQuery, [eanInput]);
    
    console.log(`Total de registros na tabela: ${rawResults.rows.length}`);
    
    rawResults.rows.forEach((row, index) => {
      const direction = row.produto_ean.replace(/\D/g, '') === eanInput ? '→' : '←';
      const relatedEan = row.produto_ean.replace(/\D/g, '') === eanInput ? 
        row.relacionado_ean : row.produto_ean;
      const relatedName = row.produto_ean.replace(/\D/g, '') === eanInput ? 
        row.relacionado_nome : row.produto_nome;
        
      console.log(`  ${index + 1}. ${direction} ${relatedEan} - ${relatedName}`);
    });

    // 2. Identificar relacionamentos bidirecionais
    console.log('\n=== IDENTIFICANDO BIDIRECIONAIS ===');
    
    const relationships = new Map();
    
    rawResults.rows.forEach(row => {
      const produtoLimpo = row.produto_ean.replace(/\D/g, '');
      const relacionadoLimpo = row.relacionado_ean.replace(/\D/g, '');
      
      // Criar chave ordenada para identificar relacionamentos bidirecionais
      const key = [produtoLimpo, relacionadoLimpo].sort().join('|');
      
      if (!relationships.has(key)) {
        relationships.set(key, []);
      }
      
      relationships.get(key).push({
        produto: produtoLimpo,
        relacionado: relacionadoLimpo,
        produto_nome: row.produto_nome,
        relacionado_nome: row.relacionado_nome,
        lift: row.lift,
        confidence: row.confidence
      });
    });

    // Mostrar relacionamentos bidirecionais
    relationships.forEach((rels, key) => {
      if (rels.length > 1) {
        console.log(`\n🔴 BIDIRECIONAL: ${key}`);
        rels.forEach((rel, idx) => {
          console.log(`  ${idx + 1}. ${rel.produto} → ${rel.relacionado} (${rel.relacionado_nome})`);
          console.log(`      Lift: ${rel.lift}, Confidence: ${rel.confidence}`);
        });
      }
    });

    // 3. Testar query atual (com problema)
    console.log('\n=== QUERY ATUAL (COM PROBLEMA) ===');
    
    const queryAtual = `
      WITH base AS (
        SELECT
          CASE WHEN REGEXP_REPLACE(produto_ean,'\\D','','g') = $1
               THEN REGEXP_REPLACE(relacionado_ean,'\\D','','g')
               ELSE REGEXP_REPLACE(produto_ean,'\\D','','g')
          END AS ean_rel,
          COALESCE(
            CASE WHEN REGEXP_REPLACE(produto_ean,'\\D','','g') = $1 THEN relacionado_nome END,
            CASE WHEN REGEXP_REPLACE(relacionado_ean,'\\D','','g') = $1 THEN produto_nome END
          ) AS nome_rel,
          lift,
          confidence
        FROM produto_relacionado
        WHERE REGEXP_REPLACE(produto_ean,'\\D','','g') = $1
           OR REGEXP_REPLACE(relacionado_ean,'\\D','','g') = $1
      ),
      ranked AS (
        SELECT
          ean_rel,
          nome_rel,
          lift,
          confidence,
          ROW_NUMBER() OVER (
            PARTITION BY ean_rel
            ORDER BY lift DESC NULLS LAST, confidence DESC NULLS LAST
          ) AS rn
        FROM base
      )
      SELECT ean_rel, nome_rel, lift, confidence
      FROM ranked
      WHERE rn = 1
      ORDER BY lift DESC NULLS LAST, confidence DESC NULLS LAST
    `;

    const resultAtual = await query(queryAtual, [eanInput]);
    
    console.log(`Resultado query atual: ${resultAtual.rows.length} produtos`);
    
    // Contar ocorrências de cada EAN no resultado
    const contadorAtual = {};
    resultAtual.rows.forEach(row => {
      contadorAtual[row.ean_rel] = (contadorAtual[row.ean_rel] || 0) + 1;
    });
    
    // Mostrar duplicatas
    Object.keys(contadorAtual).forEach(ean => {
      if (contadorAtual[ean] > 1) {
        console.log(`🔴 DUPLICATA: ${ean} aparece ${contadorAtual[ean]} vezes`);
      }
    });

    resultAtual.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.ean_rel} - ${row.nome_rel}`);
    });

    // 4. Testar query corrigida
    console.log('\n=== QUERY CORRIGIDA ===');
    
    const queryCorrigida = `
      WITH todos_relacionamentos AS (
        SELECT
          REGEXP_REPLACE(relacionado_ean,'\\D','','g') AS ean_relacionado,
          relacionado_nome AS nome_relacionado,
          lift,
          confidence
        FROM produto_relacionado
        WHERE REGEXP_REPLACE(produto_ean,'\\D','','g') = $1
          AND relacionado_ean IS NOT NULL
          AND REGEXP_REPLACE(relacionado_ean,'\\D','','g') != $1
        
        UNION
        
        SELECT
          REGEXP_REPLACE(produto_ean,'\\D','','g') AS ean_relacionado,
          produto_nome AS nome_relacionado,
          lift,
          confidence
        FROM produto_relacionado
        WHERE REGEXP_REPLACE(relacionado_ean,'\\D','','g') = $1
          AND produto_ean IS NOT NULL
          AND REGEXP_REPLACE(produto_ean,'\\D','','g') != $1
      ),
      melhor_por_ean AS (
        SELECT DISTINCT ON (ean_relacionado)
          ean_relacionado,
          nome_relacionado,
          lift,
          confidence
        FROM todos_relacionamentos
        ORDER BY 
          ean_relacionado,
          lift DESC NULLS LAST, 
          confidence DESC NULLS LAST
      )
      SELECT ean_relacionado, nome_relacionado, lift, confidence
      FROM melhor_por_ean
      ORDER BY lift DESC NULLS LAST, confidence DESC NULLS LAST
    `;

    const resultCorrigido = await query(queryCorrigida, [eanInput]);
    
    console.log(`Resultado query corrigida: ${resultCorrigido.rows.length} produtos`);
    
    resultCorrigido.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.ean_relacionado} - ${row.nome_relacionado}`);
    });

    // 5. Comparação final
    console.log('\n=== COMPARAÇÃO ===');
    console.log(`Query atual: ${resultAtual.rows.length} produtos`);
    console.log(`Query corrigida: ${resultCorrigido.rows.length} produtos`);
    
    const duplicatasRemovidas = resultAtual.rows.length - resultCorrigido.rows.length;
    if (duplicatasRemovidas > 0) {
      console.log(`✅ Query corrigida removeu ${duplicatasRemovidas} duplicata(s)!`);
    } else {
      console.log('⚠️ Nenhuma duplicata encontrada ou problema em outro lugar');
    }

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  } finally {
    process.exit(0);
  }
}

diagnosticarBidirecionais(ean);