# RADIANT — CLAUDE.md

Sistema operacional para vendas de camisetas estampadas em shows ao vivo.
Vendedor ambulante com estamparia própria (tinta à base de água), São Paulo.
Repositório: github.com/cianometalico/showtracker

---

## STACK

- Next.js 14 (App Router) + TypeScript
- Supabase (PostgreSQL) — https://usunykcduxeaevcdczcz.supabase.co
- Tailwind CSS + tema escuro customizado
- Deploy: Vercel

---

## REGRAS CRÍTICAS

### Nunca usar Cursor AI
Cursor corrompeu schema e criou duplicatas. Todo código via Claude.

### FK shows → artistas via show_artists
Não existe `artist_id` direto em `shows`. Sempre usar `show_artists`.

### Nunca hardcodar cores
Usar variáveis CSS: `var(--nav-bg)`, `var(--surface)`, `var(--cyan)`, `var(--text)`, `var(--text-dim)`, `var(--text-muted)`, `var(--border)`, `var(--red)`, `var(--green)`, `var(--amber)`.

### Caixa baixa nos nichos/públicos
Toda a seção de Públicos usa caixa baixa.

---

## SCHEMA SUPABASE

```sql
artists: id, nome, pais, mbid, genre_id (FK→genres), tags_editorial jsonb,
  tags_behavioral jsonb, lastfm_listeners, wikipedia_url, similar_artists jsonb,
  ultima_atualizacao

venues: id, nome, cidade, lat, lng, capacidade_praticavel, tipo_default,
  zona_risco bool, risco_fiscalizacao (low|medium|high)

shows: id, venue_id, data, nome_evento (nullable), status_ingresso
  (sold out|bem vendido|mal vendido), publico_estimado, participou bool,
  resultado_geral, concorrencia, clima_estimado, observacoes, singularidades jsonb,
  source_url, legado bool

show_artists: show_id, artist_id, ordem int, faz_estampa bool (PK composta)

genres: id, nome, zona, descritores jsonb

nichos: id, nome, cor, underground_score int (1-10), descritores jsonb,
  corporalidade jsonb, mentalidade jsonb, tags jsonb, descricao

artist_nichos: artist_id, nicho_id, score numeric (PK composta)

artist_similar: artist_id, similar_name, similar_mbid, score
```

### Status ingresso (valores reais no banco)
`sold out` | `bem vendido` | `mal vendido`

### Público estimado
Calculado por: `capacidade_praticavel × fator`
- sold out: 0.95 | bem vendido: 0.70 | mal vendido: 0.40

---

## ESTRUTURA DE ROTAS

```
app/
  page.tsx                          ← Home (PENDENTE fase 2)
  layout.tsx                        ← Nav hierárquico com separadores
  globals.css                       ← Tema escuro
  shows/
    page.tsx + shows-list-client.tsx ← Lista com filtros + busca
    new/page.tsx + new-show-client.tsx + actions.ts
    [id]/page.tsx                   ← Detalhe com clima, lineup, venue
    [id]/weather-widget.tsx         ← Clima via OpenWeather (≤5 dias)
    [id]/editar/page.tsx + edit-show-client.tsx + actions.ts
  artistas/
    page.tsx + artistas-list-client.tsx ← Lista com busca
    [id]/page.tsx                   ← Perfil + nichos + tags + shows
    [id]/nicho-manager.tsx          ← Vinculação artista↔nicho
    [id]/actions.ts                 ← linkNicho, unlinkNicho
  locais/
    page.tsx                        ← Lista com capacidade
    [id]/page.tsx                   ← Detalhe + histórico
    [id]/actions.ts                 ← updateVenue, deleteVenue
    [id]/editar/page.tsx + edit-venue-client.tsx
  publicos/
    page.tsx                        ← Nichos + gêneros + sem nicho
    [id]/page.tsx                   ← Detalhe do nicho (4 níveis)
    generos/[id]/page.tsx           ← Detalhe do gênero
  ohara/page.tsx                    ← Enriquecimento de artistas
  api/
    weather/route.ts                ← OpenWeather 5 dias
    enrich/route.ts                 ← Enriquecimento individual
    enrich-all/route.ts             ← Enriquecimento em massa (bootstrap)
    artists/route.ts                ← POST com dedup por mbid→nome
    link-nichos/route.ts            ← Auto-link artista↔nicho por tags
    musicbrainz/route.ts
    lastfm/route.ts
    wikipedia/route.ts
    discogs/route.ts
    setlistfm/route.ts
```

---

## CAMADA DE DADOS

```
lib/
  nicho-color.ts    ← nichoColor(nome, score) e nichoColorAlpha()
                       hue golden ratio, lightness 55-80% por underground_score
```

---

## ENRIQUECIMENTO (ohara)

Pipeline: MusicBrainz (mbid) → Last.fm (listeners, tags) → Wikipedia → Setlist.fm
- `enrich-all` processa artistas sem mbid sequencialmente com rate limiting
- `/api/artists` faz upsert: mbid → nome ilike sem mbid → cria novo
- 170 artistas enriquecidos, 183 shows importados (legado=true)

---

## NICHOS

Clusters manuais de público com:
- `corporalidade`: faixa etária, estética, geração
- `mentalidade`: valores, comportamento de compra, concorrência típica
- `underground_score` 1-10: escuro=underground, claro=mainstream
- Cor gerada automaticamente por `nichoColor()` — determinístico pelo nome

Nichos existentes:
- **post-hc millenium** (score=2) — Refused, ATDI, Fall of Troy
- **hip-hop gen z** (score=6) — Kendrick, Tyler, BK

Link artista↔nicho: manual via página do artista (NichoManager)
Auto-link via `/api/link-nichos` (bootstrap, usa apenas nicho.tags não descritores)

---

## VENUES GEOLOCALIZADOS

15 venues SP com lat/lng e capacidade_praticavel real.
Principais: Allianz Parque (55k), Morumbi (75k), Interlagos (100k),
Audio (3.2k), Carioca Club (1.2k), Cine Joia (992).

---

## ENV VARS

```
NEXT_PUBLIC_SUPABASE_URL=https://usunykcduxeaevcdczcz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
LASTFM_API_KEY=...
SETLISTFM_API_KEY=...
DISCOGS_TOKEN=...
OPENWEATHER_API_KEY=...
```

---

## FASE 2 — PENDENTE

### 1. Página Home
Calendário 10 dias à frente com shows agendados.
Cards compactos por dia: nome evento, venue, status.
Acesso rápido: último show editado, shows sem resultado, alertas.
Show só aparece se `participou=false` e data futura.

### 2. Ohara inline na id page do artista
Hoje: botão redireciona para `/ohara?prefill=nome`.
Objetivo: painel de enriquecimento embutido na página do artista.
Busca MB, exibe candidatos, aplica sem sair da página.
Requer transformar a page em client ou criar componente client separado.

### 3. Setlist.fm na id page do show
Mostrar histórico de setlists do(s) artista(s) no venue ou no Brasil.
Já temos a rota `/api/setlistfm`. Falta exibir na página do show.
Contexto: útil para saber o repertório esperado (fator de decisão de estampa).

### 4. Múltiplas datas por evento
Bangers Open Air tem datas diferentes (sexta e sábado).
Hoje cada data é um show separado com mesmo nome_evento.
Solução futura: tabela `show_dates` com show_id + data + lineup própria.
Não implementar antes de ter 5+ casos reais — evitar over-engineering.

### 5. Histórico anterior ao app
Shows antes da planilha Notion — buscar por venue (Cine Joia, Carioca Club etc.)
no calendário histórico desses locais + memória do usuário.
Gerar CSV, importar com `legado=true` e `participou=true/false`.

### 6. ML fase 3
Regressão com scikit-learn quando ~30 shows tiverem `resultado_geral` preenchido.
Features: listeners, status_ingresso, capacidade, concorrencia, underground_score do nicho.
Target: resultado_geral ou quantidade vendida (quando tiver o campo).
Rodar localmente, exportar modelo, Radiant chama via API Python simples.

### 7. Resultado e peças vendidas
Hoje `resultado_geral` é enum qualitativo (sucesso/fracasso).
Para o ML funcionar bem: adicionar `pecas_levadas int` e `pecas_vendidas int`.
Isso destrava a regressão numérica real.

### 8. Songkick API
Aguardando aprovação. Quando ativa: buscar shows futuros por artista automaticamente.

---

## DECISÕES DE DESIGN

- Inferência descontinuada — substituída por dados reais + ML futuro
- Participação calculada automaticamente pela data (passado=true, futuro=false)
- Gênero alimentado pelo ohara (tags MB + Last.fm), não campo manual
- Nichos são curadoria manual — auto-link é apenas sugestão inicial
- Legado = shows importados da planilha (campo legado=true, não editável)
- `risco_fiscalizacao` é o único campo de risco do venue (zona_risco ignorado na UI)