-- v0.5.0: designs e estoque de peças

-- Tabela de designs
CREATE TABLE designs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  artist_id uuid NOT NULL REFERENCES artists(id) ON DELETE RESTRICT,
  descricao text,
  created_at timestamptz DEFAULT now(),
  ativo boolean DEFAULT true
);

CREATE INDEX idx_designs_artist ON designs(artist_id);
CREATE INDEX idx_designs_ativo ON designs(ativo) WHERE ativo = true;

-- Log de movimentações de estoque
CREATE TABLE stock_movements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  design_id uuid NOT NULL REFERENCES designs(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('produzido', 'levado', 'vendido', 'perdido')),
  quantidade int NOT NULL CHECK (quantidade > 0),
  show_id uuid REFERENCES shows(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  observacoes text
);

CREATE INDEX idx_stock_design ON stock_movements(design_id);
CREATE INDEX idx_stock_show ON stock_movements(show_id) WHERE show_id IS NOT NULL;
CREATE INDEX idx_stock_tipo ON stock_movements(tipo);

-- View de saldo por design
CREATE OR REPLACE VIEW design_stock AS
SELECT
  d.id AS design_id,
  d.nome,
  d.artist_id,
  d.ativo,
  COALESCE(SUM(CASE WHEN sm.tipo = 'produzido' THEN sm.quantidade ELSE 0 END), 0) AS total_produzido,
  COALESCE(SUM(CASE WHEN sm.tipo = 'vendido' THEN sm.quantidade ELSE 0 END), 0) AS total_vendido,
  COALESCE(SUM(CASE WHEN sm.tipo = 'perdido' THEN sm.quantidade ELSE 0 END), 0) AS total_perdido,
  COALESCE(SUM(CASE WHEN sm.tipo = 'produzido' THEN sm.quantidade ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN sm.tipo = 'vendido' THEN sm.quantidade ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN sm.tipo = 'perdido' THEN sm.quantidade ELSE 0 END), 0) AS saldo_atual
FROM designs d
LEFT JOIN stock_movements sm ON sm.design_id = d.id
GROUP BY d.id, d.nome, d.artist_id, d.ativo;

-- Busca accent-insensitive para designs
CREATE OR REPLACE FUNCTION search_designs(search_term text)
RETURNS SETOF designs AS $$
  SELECT * FROM designs
  WHERE unaccent(lower(nome)) LIKE '%' || unaccent(lower(search_term)) || '%'
  ORDER BY nome
  LIMIT 10;
$$ LANGUAGE sql STABLE;
