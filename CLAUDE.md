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

venues: id, nome, cidade, bairro (nullable), lat, lng, capacidade_praticavel,
  tipo_default, zona_risco bool, risco_fiscalizacao (low|medium|high)

shows: id, venue_id, data, nome_evento (nullable), status_ingresso
  (sold out|bem vendido|mal vendido|null=sem informação), publico_estimado, participou bool,
  resultado_geral, concorrencia, clima_estimado, observacoes, singularidades jsonb,
  source_url, legado bool, pecas_levadas int, pecas_vendidas int,
  fiscalizacao_override (string|null), publico_estimado_manual (bool|null),
  tipo_venue_override (string|null)

show_artists: show_id, artist_id, ordem int, faz_estampa bool (PK composta)

genres: id, nome, zona, descritores jsonb

nichos: id, nome, cor, underground_score int (1-10), descritores jsonb,
  corporalidade jsonb, mentalidade jsonb, tags jsonb, descricao

artist_nichos: artist_id, nicho_id, score numeric (PK composta)

artist_similar: artist_id, similar_name, similar_mbid, score

designs: id, nome, artist_id (FK→artists), descricao, created_at, ativo bool

stock_movements: id, design_id (FK→designs), tipo (produzido|levado|vendido|perdido),
  quantidade int, show_id (FK→shows, nullable), created_at, observacoes

-- VIEW: design_stock
design_stock: design_id, nome, artist_id, ativo,
  total_produzido, total_vendido, total_perdido, saldo_atual
```

### Status ingresso (valores reais no banco)
`sold out` | `bem vendido` | `mal vendido` | `null` (sem informação)
Quando null → `publico_estimado` é explicitamente nullado no update.

### Público estimado
Calculado por: `capacidade_praticavel × fator`
- sold out: 0.95 | bem vendido: 0.70 | mal vendido: 0.40
- status null → publico_estimado = null (não calculado)

---

## ESTRUTURA DE ROTAS

```
app/
  page.tsx                          ← Home: painel operacional (stats 3 cards + OharaSearch + calendário mensal + pendências + ações)
  home-calendar.tsx                 ← HomeCalendar client component (grid 7×N, ←/→ via router.push ?mes=YYYY-MM)
  layout.tsx                        ← Nav hierárquico com separadores
  globals.css                       ← Tema escuro
  agenda/
    page.tsx + agenda-client.tsx    ← Agenda (calendário)
  generos/
    page.tsx                        ← Lista de gêneros (separada de /publicos/generos/[id])
  shows/
    page.tsx + shows-list-client.tsx ← Lista com filtros + busca
    new/page.tsx + new-show-client.tsx + actions.ts ← Múltiplas datas: cada DateEntry gera um show
    [id]/page.tsx                   ← Detalhe com clima, lineup, venue, estoque
    [id]/show-detail-client.tsx     ← Edição inline (toggle read/edit + seção resultado)
    [id]/show-stock-section.tsx     ← Seção peças por design (client, renders quando participou=true ou há movements)
    [id]/show-history-block.tsx     ← Histórico Setlist.fm
    [id]/weather-widget.tsx         ← Clima via OpenWeather (≤5 dias)
    [id]/actions.ts                 ← updateShowInline, updateResultado, updateParticipou, deleteShow, searchVenues, addShowMovement
  artistas/
    page.tsx + artistas-list-client.tsx ← Lista com busca + botão "+ novo artista" (abre OharaSearch via ?abrir=artista)
    [id]/page.tsx                   ← Perfil + nichos + tags + designs + shows
    [id]/artist-detail-client.tsx   ← Edição inline (nome, país read-only se tem mbid) + exclusão com verificação de deps
    [id]/nicho-manager.tsx          ← Vinculação artista↔nicho
    [id]/actions.ts                 ← linkNicho, unlinkNicho, updateArtist, deleteArtist
  estoque/
    page.tsx + estoque-list-client.tsx  ← Lista de designs com saldo (view design_stock)
    new/page.tsx + new-design-client.tsx + actions.ts ← Criar design
    [id]/page.tsx                   ← Detalhe do design (server: saldo + movements + shows)
    [id]/design-detail-client.tsx   ← Edição inline + form movimentação + histórico
    [id]/actions.ts                 ← updateDesign, addMovement, deleteMovement, deleteDesign
  locais/
    page.tsx                        ← Lista com capacidade
    [id]/page.tsx                   ← Detalhe + histórico
    [id]/venue-detail-client.tsx    ← Edição inline (toggle read/edit)
    [id]/actions.ts                 ← updateVenueInline, deleteVenue
  publicos/
    page.tsx                        ← Nichos + gêneros + sem nicho
    [id]/page.tsx                   ← Detalhe do nicho (4 níveis)
    generos/[id]/page.tsx           ← Detalhe do gênero
  ohara/page.tsx                    ← Enriquecimento de artistas (rota existe mas link removido da nav)
components/
  artist-picker.tsx               ← ArtistPicker (3 fases: local → MusicBrainz → enrich+save)
  ohara-search.tsx                ← OharaSearch (busca local → MB → enrich+navigate; auto-abre via ?abrir=artista; no header do layout)
  api/
    weather/route.ts                ← OpenWeather 5 dias
    enrich/route.ts                 ← Enriquecimento individual
    enrich-all/route.ts             ← Enriquecimento em massa (bootstrap)
    artists/route.ts                ← GET ?search= (busca local, limit 8) + POST com dedup por mbid→nome
    artist-shows/route.ts           ← Shows por artista
    link-nichos/route.ts            ← Auto-link artista↔nicho por tags
    scrape/route.ts                 ← Scraping auxiliar
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
  show-utils.ts     ← isShowPast, participacaoLabel, getShowDisplayName
  text-utils.ts     ← removeAccents (normalização NFD para busca accent-insensitive)
  db/
    shows.ts        ← getShows, getShow, createShow, updateShow, getShowsInRange
    artists.ts      ← getArtists, getArtist, upsertArtist, updateArtist
  utils.ts          ← getNomeEvento, formatDataShow, corResultado, labelStatusIngresso, labelResultado

types/
  database.ts       ← tipos gerados pelo Supabase CLI

utils/supabase/
  client.ts         ← cliente browser
  server.ts         ← cliente server-side
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

25 venues cadastrados (24 SP + 1 Curitiba).
Campos: lat, lng, capacidade_praticavel, tipo_default, bairro, endereco,
subprefeitura_id (FK→subprefeituras), risco_fiscalizacao (low|medium|high).

Subprefeituras mapeadas (tabela subprefeituras):
Lapa (O) · Pinheiros (O) · Sé (C) · Vila Mariana (S) ·
Butantã (O) · Santo Amaro (S) · Santana/Tucuruvi (N) · Mooca (L)

Lógica de risco (empírica, não administrativa):
- GCM + Rapa = perigo real
- PM = ordem geral, não fiscal de ambulante
- Exposição física na via pública > jurisdição administrativa
- Grande porte (>30k) atrai operação especial independente da subpref

Venues por risco:
high   → Morumbi, Interlagos, Ibirapuera, Vibra SP
medium → Allianz, Anhembi, Unimed, Memorial AL, Madame Sata,
          Teatro Liberdade, Suhai, Komplexo Tempo
low    → Audio, Burning Bar, Carioca Club, Rockambole, Cine Joia,
          Hangar 110, Usine, Fabrique, Studio Stage, Terra SP,
          Tokio Marine Hall, Vip Station

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

## DECISÕES DE DESIGN

- Inferência removida na v0.1.0 — código deletado na auditoria. ML planejado para fase 3 (ver ROADMAP.md)
- Gênero alimentado pelo ohara (tags MB + Last.fm), não campo manual
- Nichos são curadoria manual — auto-link é apenas sugestão inicial
- Legado = shows importados da planilha (campo legado=true, não editável pelo usuário). Todos os outros campos de um show legado SÃO editáveis normalmente.
- `risco_fiscalizacao` é o único campo de risco do venue (zona_risco ignorado na UI)
- **v0.4.0**: Edição inline substituiu rotas `/editar` — toggle read/edit no próprio detalhe; `startEdit()` ressincroniza state dos props antes de abrir o modo edição para evitar stale values
- **v0.4.0**: `ArtistPicker` (3 fases): busca local (300ms debounce) → MusicBrainz (500ms debounce) → enrich+save via `/api/enrich` + `/api/artists`. Integrado em `shows/new` e `show-detail-client`. Falta integrar na página do artista (ohara inline pendente).
- **v0.4.0**: Upsert de artistas do show é atômico — `updateShowInline` faz delete+insert de todos os `show_artists` quando o parâmetro `artistas[]` é passado. Não há mais operações por peça (add/remove/reorder individuais).
- **v0.4.0**: `faz_estampa` agora editável via ArtistPicker (checkbox na lista de selecionados)
- **v0.4.x**: `participou` é campo editável — não calculado automaticamente. Toggle always-visible na página de detalhe (`updateParticipou`). Criação: default inteligente (passado=true, futuro=false), mas editável antes de salvar.
- **v0.4.x**: `nome_evento` é opcional; exibição usa `getShowDisplayName(nome_evento, artistas)` → fallback `artistas.join(' + ')`. Campo no form tem aparência secundária com placeholder explicativo.
- **v0.4.x**: `status_ingresso` aceita null (="sem informação"). Quando null, `publico_estimado` é zerado no update.
- **v0.4.x**: `clima_estimado` NÃO é editável pela UI (campo removido do form). Apenas exibido pelo weather-widget quando há previsão disponível.
- **v0.4.x**: Buscas accent-insensitive — server-side via RPCs `search_artists` / `search_venues` (extensão `unaccent`); client-side via `removeAccents()` em `lib/text-utils.ts`.
- **v0.4.x**: venues têm campo `bairro` (text, nullable). Exibido como "Bairro · Cidade" no detalhe do venue e no detalhe do show.
- **v0.5.0**: Múltiplas datas no form de novo show — `dates: DateEntry[]`, cada entry tem `data` + `artistas` próprios. `createShow` cria um show por entry, redireciona pro primeiro. Campos globais: nome_evento, venue, status_ingresso, concorrencia, source_url, observacoes.
- **v0.5.0**: `stock_movements` log append-only — `quantidade` sempre positivo, `tipo` determina entrada/saída. Saldo via view `design_stock`. Validação de saldo negativo antes de inserir `vendido`/`perdido`.
- **v0.5.0**: Relação movements ↔ shows.pecas_levadas/vendidas — os dois caminhos coexistem. Se há movements, exibir breakdown por design E campos manuais. Não sobrescrever automaticamente.
- **v0.5.0**: Seção estoque no show só aparece se `participou=true` OU já há movements vinculados. `ShowStockSection` é client component renderizado diretamente do `page.tsx` do show.
- **v0.5.0**: RPC `search_designs` usa `unaccent` — mesmo padrão de `search_artists`/`search_venues`.
- **v0.6.0**: Home é painel operacional — stats + OharaSearch expandido + calendário 10+3 dias (horizontal scroll, passados só se têm shows sem resultado) + pendências (3 grupos: sem resultado, participação indefinida, designs sem estoque) + ações rápidas.
- **v0.6.0**: `OharaSearch` (components/ohara-search.tsx) — busca → navegação (diferente do ArtistPicker que é busca → seleção). Click outside fecha; Escape fecha. Enriquece via `/api/enrich` + `/api/artists` e navega para `/artistas/[id]`.
- **v0.6.0 patch**: OharaSearch movido para o header do `main-content` (layout.tsx), visível em todas as páginas. Removido da sidebar. Auto-abre via `?abrir=artista` na URL (usa useSearchParams + router.replace para limpar o param). Botão "+ novo artista" na home e na lista de artistas navega para `?abrir=artista`.
- **v0.6.0 patch**: OharaSearch dropdown de resultados locais exibe: nome, país, primeira tag editorial, ouvintes last.fm formatado. Candidatos MB: nome, país, tipo, disambiguation.
- **v0.6.0**: Labels pt-BR em todo o app — "Venue" → "local", "Buscar..." → "buscar...", "Listeners" → "ouvintes", "+ Novo show" → "+ novo show", "Buscar venue..." → "buscar local...", "Sold Out" (legenda agenda) → "esgotado".
- **v0.6.0 patch**: Home stats: 3 cards (hoje, este mês, acervo) — removido "pendentes". Calendário: grid mensal 7×N (seg-dom, pt-BR), navegação ←/→ via `?mes=YYYY-MM` searchParam. `app/home-calendar.tsx` é o client component do grid. `page.tsx` aceita `searchParams.mes`, busca shows do mês inteiro (primeiroDia–ultimoDia), constrói `showsByDate` pré-computado e passa para `HomeCalendar`.

---

## VERSÃO

**v0.6.1** (2026-03-27) — CRUD artistas, OharaSearch no header, busca enriquecida, pais read-only com mbid