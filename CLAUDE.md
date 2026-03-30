# RADIANT — CLAUDE.md

Sistema operacional para vendas de camisetas estampadas em shows ao vivo.
Vendedor ambulante com estamparia própria (tinta à base de água), São Paulo.
Repositório: github.com/cianometalico/showtracker

**Versão atual: v0.6.1** (2026-03-27)
Próxima: v0.9.0 (UX/Layout Pass — ver ROADMAP v0.9.0 abaixo)

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
Sempre variáveis CSS. Nunca valores hex diretos no código.
Usar tokens semânticos (ver seção SISTEMA VISUAL v0.9.0).

### Caixa baixa nos nichos/públicos
Toda a seção de Públicos usa caixa baixa (Instrument Serif lowercase).

### Ler antes de tocar
Nunca modificar arquivos sem ler o conteúdo real primeiro.

### PowerShell: nunca &&
Usar `;` ou linhas separadas para encadear comandos.

---

## SISTEMA VISUAL v0.9.0

```
.structurecore   cyan #6ec8d8   organização, labels, nav, estrutura
.datacore        amber #e8b830  Ohara, enriquecimento, custódia do dado
.bodycore        IBM Plex Mono  a grade/tela antes do conteúdo existir
```

### Tipografia

Duas fontes. Nenhuma outra. Google Fonts, ambas free/open-source.

```
IBM Plex Mono      .bodycore — terminal, dados, labels, nav, venues
                   Pesos: regular (400) + medium (500) apenas

Instrument Serif   .datacore/.structurecore — conteúdo, nomes, nichos
                   Pesos: regular (400) + italic
```

**Descontinuadas:** Cinzel, JetBrains Mono, system-ui como escolha intencional.

#### Gramática tipográfica

```
IBM PLEX MONO CAPS    labels de campo, categorias, nav, venues
                      cor: cyan quando .structurecore
                      ex: ARTISTA · LISTENERS · RISCO · CARIOCA CLUB

IBM Plex Mono lower   números, dados técnicos, timestamps, hex, ids
                      cor: conforme contexto (cyan / amber / status)
                      ex: 482.391 · 2024-03-15

Instrument Serif      conteúdo, descrições, nomes próprios
                      lowercase: nichos, tags, estados textuais
                      Title Case: nomes próprios (artistas, eventos)
                      cor: text-primary padrão, amber se dado Ohara
                      ex: post-hc millenium · Refused · Bangers Open Air
```

#### Regras de case

```
SEMPRE CAPS MONO:      labels de campo, nav, categorias, venues
sempre lower serif:    nichos, descrições, tags, estados textuais
Title Case serif:      nomes próprios (artistas, eventos)
lower mono:            números, dados técnicos, timestamps
```

### Paleta e tokens CSS

#### Cores cerne

```css
--cyan:    #6ec8d8    /* .structurecore — estrutura, nav, destaque primário */
--amber:   #e8b830    /* .datacore — Ohara, dado enriquecido, escasso */
```

#### Paleta de status (gradiente contínuo)

Não são categorias fixas — são posições num espectro.

```css
--status-pos:    #6e90d8    /* steel blue — confirmação, resultado bom */
--status-neut+:  #7a8a9e    /* cinza-azulado — tendência positiva */
--status-neut:   #8a8886    /* cinza quente — sem carga, observando */
--status-neut-:  #9e807a    /* cinza-avermelhado — atenção */
--status-neg:    #db291d    /* tomato — urgente, risco alto */
```

Campos que usam paleta de status: `resultado_geral`, `risco_fiscalizacao`,
`underground_score`, qualquer campo que gradue de bom para ruim.

**Descontinuados:** lime `#a0e650`, red antigo `#e85050`.

#### Texto

```css
--text-primary:  ~#E8E4E0    /* soft white — headings, dados primários */
--text-dim:      ~#9A9890    /* metadados, timestamps, secundário */
--text-muted:    ~#6E6C64    /* disponível mas não urgente */
```

#### Fundos

```css
--nav-bg:        #080b10    /* quase preto */
--content-bg:    #0c1018    /* ligeiramente mais claro */
```

#### Tokens semânticos (usar estes, não as cores brutas)

```css
--accent-structure:  var(--cyan)
--accent-data:       var(--amber)

--surface-nav:       baseado em --nav-bg
--surface-base:      fundo principal de conteúdo
--surface-raised:    card / bloco elevado
--surface-enriched:  dado convergido (mais luminoso) — artista com mbid
--surface-raw:       dado cru / pendente — artista sem mbid
```

### Superfícies

Dois eixos: enriquecimento (`surface-raw` → `surface-enriched`) e temporalidade.
`surface-enriched`: artista com mbid + listeners + nicho — borda amber 1px.
`surface-raw`: artista sem mbid — luminância reduzida, indicador pendente visível.
Hierarquia por luminância, não por bordas. Remover bordas desnecessárias.

### nichoColor()

Localização: `lib/nicho-color.ts` — `nichoColor(nome, score)` e `nichoColorAlpha()`
Hue por golden ratio (determinístico pelo nome), lightness 55–80% por `underground_score`.

Propagação descendente:
```
nicho (cor plena) → artista (alpha × score/10) → show (tint sutil) → derivados (dot/borda 1px)
```

Usar apenas `nicho.tags` para matching — nunca `descritores` (falsos positivos).

### Ohara visual

Tudo que vem do pipeline Ohara: amber na fonte ou borda `1px var(--amber)`.
Página `/ohara`: amber como ambiente visual dominante.
Indicador inline: enriquecido vs pendente — sempre com label, nunca glifo isolado.

### Indicadores visuais

**Descontinuados:**
- Glifos I Ching no nav — responsabilidade transferida para .bodycore
- Glifos funcionais (⊙ ◇ ∴ ◉ ⊘ ⟁ ✦ ⊕ ☾ ⏣ ⦿) — redundância semiótica

**Princípio:** cor + forma + label sempre juntos. Nunca glifo sem label.

#### Padrão metadata pipe

```
[Instrument Serif, nome/título]
[IBM PLEX MONO, campo1] | [campo2] | [campo3]

ex: Refused
    SUÉCIA | enriquecido | mbid a5f3c8e1 | 482.391 listeners

ex: Carioca Club — 2024-04-12
    LIBERDADE | 1.200 cap | risco high | bem vendido | participou
```

---

## SEGURANÇA — SUPPLY CHAIN & SECRETS

- Cada dependency responde: "seria 2x mais difícil escrever isso em TS puro?"
- Foco em packages que fazem network calls ou processam credenciais
- Supabase anon key é pública (`NEXT_PUBLIC_`), RLS é a segurança real. Service keys nunca em client
- API keys (Last.fm, OpenWeather, etc): apenas `.env.local`, nunca em commit
- Nunca logar valores completos de env vars em console ou responses de API
- `npm audit` com fail-on-high no pipeline. Limitar deploy ao admin no Vercel
- v2.0+: Supabase Auth built-in, nunca armazenar senhas em texto plano

---

## SCHEMA SUPABASE

```sql
artists: id, nome, pais, mbid, genre_id (FK→genres), tags_editorial jsonb,
  tags_behavioral jsonb, lastfm_listeners, wikipedia_url, similar_artists jsonb,
  ultima_atualizacao

venues: id, nome, cidade, bairro (nullable), lat, lng, capacidade_praticavel,
  tipo_default, zona_risco bool, risco_fiscalizacao (low|medium|high),
  endereco text, subprefeitura_id (FK→subprefeituras)

shows: id, venue_id, data, nome_evento (nullable), status_ingresso
  (sold out|bem vendido|mal vendido|null=sem informação), publico_estimado,
  participou bool, resultado_geral, concorrencia, clima_estimado, observacoes,
  singularidades jsonb, source_url, legado bool,
  pecas_levadas int, pecas_vendidas int,
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

-- VIEW
design_stock: design_id, nome, artist_id, ativo,
  total_produzido, total_vendido, total_perdido, saldo_atual

-- TABELA
subprefeituras: id, nome, zona, operacao_delegada, perfil, risco_base, notas, fonte_legal
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
  page.tsx                          ← Home: stats 3 cards + OharaSearch + calendário mensal + pendências + ações
  home-calendar.tsx                 ← HomeCalendar client (grid 7×N, ←/→ via ?mes=YYYY-MM)
  layout.tsx                        ← Nav + OharaSearch no header
  globals.css                       ← Tema escuro + tokens CSS
  agenda/
    page.tsx + agenda-client.tsx    ← Agenda (calendário)
  generos/
    page.tsx                        ← Lista de gêneros
  shows/
    page.tsx + shows-list-client.tsx ← Lista com filtros + busca
    new/page.tsx + new-show-client.tsx + actions.ts ← Múltiplas datas: cada DateEntry gera um show
    [id]/page.tsx                   ← Detalhe: clima, lineup, venue, estoque
    [id]/show-detail-client.tsx     ← Edição inline (toggle read/edit + seção resultado)
    [id]/show-stock-section.tsx     ← Seção peças por design (client)
    [id]/show-history-block.tsx     ← Histórico Setlist.fm
    [id]/weather-widget.tsx         ← Clima via OpenWeather (≤5 dias)
    [id]/actions.ts                 ← updateShowInline, updateResultado, updateParticipou,
                                       deleteShow, searchVenues, addShowMovement
  artistas/
    page.tsx + artistas-list-client.tsx ← Lista + botão "+ novo artista" (?abrir=artista)
    [id]/page.tsx                   ← Perfil: nichos + tags + designs + shows
    [id]/artist-detail-client.tsx   ← Edição inline + exclusão com verificação de deps
    [id]/nicho-manager.tsx          ← Vinculação artista↔nicho
    [id]/actions.ts                 ← linkNicho, unlinkNicho, updateArtist, deleteArtist
  estoque/
    page.tsx + estoque-list-client.tsx  ← Lista de designs com saldo (view design_stock)
    new/page.tsx + new-design-client.tsx + actions.ts
    [id]/page.tsx                   ← Detalhe: saldo + movements + shows
    [id]/design-detail-client.tsx   ← Edição inline + form movimentação + histórico
    [id]/actions.ts                 ← updateDesign, addMovement, deleteMovement, deleteDesign
  locais/
    page.tsx                        ← Lista com capacidade + risco
    [id]/page.tsx                   ← Detalhe + histórico
    [id]/venue-detail-client.tsx    ← Edição inline (toggle read/edit)
    [id]/actions.ts                 ← updateVenueInline, deleteVenue
  publicos/
    page.tsx                        ← Nichos + gêneros como faceta + sem nicho
    [id]/page.tsx                   ← Detalhe do nicho (4 níveis)
    generos/[id]/page.tsx           ← Detalhe do gênero
  ohara/page.tsx                    ← Enriquecimento (link removido da nav, rota existe)

components/
  artist-picker.tsx                 ← ArtistPicker (3 fases: local → MB → enrich+save)
  ohara-search.tsx                  ← OharaSearch (busca → navegação; auto-abre via ?abrir=artista)

api/
  weather/route.ts
  enrich/route.ts                   ← Enriquecimento individual
  enrich-all/route.ts               ← Enriquecimento em massa (bootstrap)
  artists/route.ts                  ← GET ?search= (busca local, limit 8) + POST dedup mbid→nome
  artist-shows/route.ts
  link-nichos/route.ts              ← Auto-link artista↔nicho por tags
  scrape/route.ts
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
  show-utils.ts     ← isShowPast, participacaoLabel, getShowDisplayName
  text-utils.ts     ← removeAccents (normalização NFD para busca accent-insensitive)
  utils.ts          ← getNomeEvento, formatDataShow, corResultado,
                       labelStatusIngresso, labelResultado
  db/
    shows.ts        ← getShows, getShow, createShow, updateShow, getShowsInRange
    artists.ts      ← getArtists, getArtist, upsertArtist, updateArtist

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

Clusters manuais de público. Caixa baixa sempre.
Lista canônica: consultar banco (tabela `nichos`) — não documentar aqui para não desatualizar.

Estrutura:
- `corporalidade`: faixa etária, estética, geração
- `mentalidade`: valores, comportamento de compra, concorrência típica
- `underground_score` 1–10: 1=underground, 10=mainstream
- Cor gerada automaticamente por `nichoColor()` — determinístico pelo nome

Link artista↔nicho: manual via NichoManager. Auto-link via `/api/link-nichos` é só bootstrap.
Matching usa apenas `nicho.tags` — nunca `descritores`.

---

## VENUES GEOLOCALIZADOS

25 venues cadastrados (24 SP + 1 Curitiba).
Campos: lat, lng, capacidade_praticavel, tipo_default, bairro, endereco,
subprefeitura_id (FK→subprefeituras), risco_fiscalizacao (low|medium|high).

Subprefeituras mapeadas:
Lapa (O) · Pinheiros (O) · Sé (C) · Vila Mariana (S) ·
Butantã (O) · Santo Amaro (S) · Santana/Tucuruvi (N) · Mooca (L)

Lógica de risco (empírica, não administrativa):
- GCM + Rapa = perigo real. PM = ordem geral, não fiscal de ambulante
- Exposição física na via pública > jurisdição administrativa
- Grande porte (>30k) atrai operação especial independente da subpref

```
high    → Morumbi, Interlagos, Ibirapuera, Vibra SP
medium  → Allianz, Anhembi, Unimed, Memorial AL, Madame Sata,
           Teatro Liberdade, Suhai, Komplexo Tempo
low     → Audio, Burning Bar, Carioca Club, Rockambole, Cine Joia,
           Hangar 110, Usine, Fabrique, Studio Stage, Terra SP,
           Tokio Marine Hall, Vip Station
```

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

## DECISÕES DE IMPLEMENTAÇÃO

- Inferência removida na v0.1.0 — código deletado. ML planejado para v2.0+
- Gênero alimentado pelo Ohara (tags MB + Last.fm), não campo manual
- Nichos são curadoria manual — auto-link é sugestão inicial
- Legado = shows importados (`legado=true`, não editável). Demais campos editáveis normalmente
- `risco_fiscalizacao` é o único campo de risco ativo na UI (`zona_risco` ignorado)
- Não implementar multi-user antes de fechar fase 2 — não hardcodar lógica single-user
- Vercel vs localhost: investigar pré-v1.0
- Modelo de trabalho: Opus (decisões) → Sonnet (instruções) → Claude Code (execução) → Bruno (testes)

### v0.4.0
- Edição inline substituiu rotas `/editar` — toggle read/edit no próprio detalhe; `startEdit()` ressincroniza state antes de abrir para evitar stale values
- `ArtistPicker` (3 fases): busca local (300ms debounce) → MusicBrainz (500ms debounce) → enrich+save via `/api/enrich` + `/api/artists`
- Upsert de artistas do show é atômico — `updateShowInline` faz delete+insert de todos os `show_artists` quando `artistas[]` é passado
- `faz_estampa` editável via ArtistPicker (checkbox na lista de selecionados)

### v0.4.x
- `participou` é campo editável — não calculado automaticamente. Toggle always-visible. Default inteligente na criação (passado=true, futuro=false)
- `nome_evento` opcional — exibição via `getShowDisplayName(nome_evento, artistas)` → fallback `artistas.join(' + ')`
- `status_ingresso` aceita null (="sem informação") → `publico_estimado` zerado
- `clima_estimado` não editável pela UI — apenas exibido pelo weather-widget
- Buscas accent-insensitive: server via RPCs `search_artists`/`search_venues` (unaccent); client via `removeAccents()`
- venues têm `bairro` (text, nullable) — exibido como "Bairro · Cidade"

### v0.5.0
- Múltiplas datas no form de novo show — `dates: DateEntry[]`, cada entry tem `data` + `artistas` próprios
- `stock_movements` log append-only — `quantidade` sempre positivo, `tipo` determina entrada/saída. Saldo via view `design_stock`. Validação de saldo negativo antes de `vendido`/`perdido`
- Seção estoque no show: só aparece se `participou=true` OU há movements vinculados
- RPC `search_designs` usa `unaccent`

### v0.6.0
- Home é painel operacional — stats + OharaSearch + calendário mensal + pendências + ações rápidas
- `OharaSearch`: busca → navegação (≠ ArtistPicker que é busca → seleção). No header do layout, visível em todas as páginas. Auto-abre via `?abrir=artista`
- Labels pt-BR em todo o app
- Calendário: grid mensal 7×N (seg-dom, pt-BR), navegação via `?mes=YYYY-MM`

---

## ROADMAP v0.9.0

Implementação em 4 fases. Não pular — cada uma depende da anterior.

```
FASE A — fundação visual (não toca layout)
  1. Paleta + tokens CSS
  2. Tipografia (IBM Plex Mono + Instrument Serif)
  3. Superfícies
  → Bruno testa no browser. Ajustes antes de continuar.

FASE B — indicadores (depende de A)
  4. Dissolver glifos I Ching e funcionais, criar indicadores .bodycore
  5. nichoColor() revisão e propagação descendente
  6. Ohara visual (amber ambiente)
  → Bruno testa cada página.

FASE C — layout (depende de A+B)
  7. Show detalhe: venue ∥ lineup, header pipe
  8. Artista detalhe: nichos ∥ tags, header pipe
  9. Listas reestruturadas (shows, artistas, locais, públicos)
  10. Nav: formato + labels MONO CAPS
  → v0.9.0 pronta para commit.

FASE D — extras (se couber)
  11. Metadata pipe em todas as páginas
  12. Loading mínimo (.bodycore)
```

**Adiado para v1.0:** logo dodecaedro, Braille expandido, Ohara inline, Home completa.
**Adiado para v2.0+:** multi-user (Auth + RLS), ML regressão, RPG UI, mobile suporte completo.

### Pretext (text layout engine)
Implementar quando: histórico 500+ shows, ou públicos 50+ entradas, ou reflow >100ms/frame.
Hoje: ~200 shows, Tailwind resolve. Não implementar antes — premature optimization.

---

## FASE 2 — PENDENTE

### 1. Ohara inline na página do artista
Hoje: botão redireciona para `/ohara?prefill=nome`.
Objetivo: painel embutido. Requer transformar em client ou componente separado.

### 2. Setlist.fm na página do show
Rota `/api/setlistfm` existe. Falta exibir.

### 3. Múltiplas datas por evento
Solução futura: tabela `show_dates`. Não implementar antes de 5+ casos reais.

### 4. Histórico anterior ao app
Gerar CSV, importar com `legado=true`.

### 5. ML fase 3
Regressão com scikit-learn quando ~30 shows tiverem `resultado_geral` preenchido.
Features: listeners, status_ingresso, capacidade, concorrencia, underground_score.

### 6. Songkick API
Aguardando aprovação.
