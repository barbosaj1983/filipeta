CREATE TABLE IF NOT EXISTS clientes (
  cpf           varchar(11) PRIMARY KEY,
  nome          text,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS produtos (
  id            bigserial PRIMARY KEY,
  ean           varchar(20) UNIQUE NOT NULL,
  nome          text NOT NULL,
  categoria     text,
  preco         numeric(12,2),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_produtos_ean ON produtos(ean);

CREATE TABLE IF NOT EXISTS compras (
  id            bigserial PRIMARY KEY,
  cpf           varchar(11) REFERENCES clientes(cpf),
  data          timestamptz NOT NULL,
  valor_total   numeric(14,2),
  loja_id       int
);
CREATE INDEX IF NOT EXISTS idx_compras_cpf_data ON compras(cpf, data DESC);

CREATE TABLE IF NOT EXISTS itens_compra (
  id            bigserial PRIMARY KEY,
  compra_id     bigint REFERENCES compras(id) ON DELETE CASCADE,
  produto_id    bigint REFERENCES produtos(id),
  ean           varchar(20),
  qtd           numeric(12,3),
  preco         numeric(12,2)
);
CREATE INDEX IF NOT EXISTS idx_itens_compra_ean ON itens_compra(ean);

CREATE TABLE IF NOT EXISTS produto_relacionado (
  produto_ean     varchar(20) NOT NULL,
  relacionado_ean varchar(20) NOT NULL,
  lift            numeric(12,4),
  confidence      numeric(12,4),
  PRIMARY KEY (produto_ean, relacionado_ean)
);

CREATE TABLE IF NOT EXISTS feedback_sugestoes (
  id            bigserial PRIMARY KEY,
  cpf           varchar(11),
  ean           varchar(20) NOT NULL,
  acao          text CHECK (acao IN ('aceitar','recusar')),
  ts            timestamptz DEFAULT now()
);
