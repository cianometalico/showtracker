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
  source_url, legado bool,
  fiscalizacao_override (string|null), publico_estimado_manual (bool|null),
  tipo_venue_override (string|null)

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
  agenda/
    page.tsx + agenda-client.tsx    ← Agenda (calendário)
  generos/
    page.tsx                        ← Lista de gêneros (separada de /publicos/generos/[id])
  shows/
    page.tsx + shows-list-client.tsx ← Lista com filtros + busca
    new/page.tsx + new-show-client.tsx + actions.ts
    [id]/page.tsx                   ← Detalhe com clima, lineup, venue
    [id]/show-client.tsx            ← Componente client do detalhe
    [id]/show-history-block.tsx     ← Histórico Setlist.fm
    [id]/weather-widget.tsx         ← Clima via OpenWeather (≤5 dias)
    [id]/actions.ts                 ← updateShow, deleteShow, addArtistToShow, removeArtistFromShow, reorderArtist, searchArtists, searchVenues
    [id]/editar/page.tsx + edit-show-client.tsx + actions.ts
  artistas/
    page.tsx + artistas-list-client.tsx ← Lista com busca
    [id]/page.tsx                   ← Perfil + nichos + tags + shows
    [id]/nicho-manager.tsx          ← Vinculação artista↔nicho
    [id]/actions.ts                 ← linkNicho, unlinkNicho
  locais/
    page.tsx                        ← Lista com capacidade
    [id]/page.tsx                   ← Detalhe + histórico
    [id]/venue-client.tsx           ← Componente client do venue
    [id]/actions.ts                 ← updateVenue, deleteVenue
    [id]/editar/page.tsx + edit_venue_client.tsx
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

## DECISÕES DE DESIGN

- Inferência removida na v0.1.0 — código deletado na auditoria. ML planejado para fase 3 (ver ROADMAP.md)
- Participação calculada automaticamente pela data (passado=true, futuro=false)
- Gênero alimentado pelo ohara (tags MB + Last.fm), não campo manual
- Nichos são curadoria manual — auto-link é apenas sugestão inicial
- Legado = shows importados da planilha (campo legado=true, não editável)
- `risco_fiscalizacao` é o único campo de risco do venue (zona_risco ignorado na UI)