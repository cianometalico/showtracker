# Changelog

Todas as mudanças relevantes do Radiant são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

---

## [0.1.0-beta] — 2026-03-24

Primeira versão funcional do sistema. Estrutura completa de CRUD, pipeline de enriquecimento operacional, 170 artistas enriquecidos e 183 shows legado importados da planilha Notion.

### Adicionado

**CRUD completo**
- Shows: criação, edição, listagem com filtros e busca, detalhe com lineup multiartista
- Artistas: listagem, perfil com tags editoriais/comportamentais, shows vinculados
- Locais: listagem com capacidade, detalhe com histórico, edição
- Públicos: nichos com corporalidade/mentalidade, gêneros com descritores
- Gêneros: página de listagem

**Relação multiartista**
- Tabela `show_artists` como junction (show_id + artist_id + ordem + faz_estampa)
- `getNomeEvento()` concatena artistas quando `nome_evento` é nulo
- NichoManager para vincular artistas a nichos manualmente

**Pipeline de enriquecimento (Ohara)**
- Cockpit em `/ohara` para enriquecimento individual e em massa
- MusicBrainz → Last.fm → Wikipedia → Discogs → Setlist.fm
- Rate limiting respeitado, upsert por mbid com fallback por nome
- 170 artistas processados no bootstrap inicial

**API routes**
- `/api/musicbrainz` — busca e match de artistas
- `/api/lastfm` — listeners e tags
- `/api/wikipedia` — URL e contexto
- `/api/discogs` — discografia
- `/api/setlistfm` — histórico de setlists
- `/api/enrich` e `/api/enrich-all` — orquestração do pipeline
- `/api/artists` — upsert com dedup
- `/api/link-nichos` — auto-link artista↔nicho por tags
- `/api/weather` — OpenWeather 5 dias
- `/api/artist-shows` — shows por artista
- `/api/scrape` — scraping auxiliar

**Nichos e públicos**
- Sistema de clusters manuais com underground_score (1-10)
- Cor determinística por `nichoColor()` (golden ratio hue)
- Corporalidade (faixa etária, estética, geração) e mentalidade (valores, comportamento)

**Infraestrutura**
- Tema escuro com variáveis CSS (`--nav-bg`, `--surface`, `--cyan`, etc.)
- Navegação hierárquica com separadores
- Weather widget e inference block na página do show
- Script Python de importação de shows legado
- CLAUDE.md como fonte única de verdade do projeto

**Dados iniciais**
- 170 artistas com mbid, listeners, tags, wikipedia_url
- 183 shows importados (legado=true) da planilha Notion
- 15 venues SP geolocalizados com capacidade_praticavel real
- 2 nichos seed: post-hc millenium, hip-hop gen z

### Removido
- Estrutura shadcn/ui (components.json, button.tsx)
- Rota legada `app/database/artistas/`
- README.md genérico do create-next-app
- RADIANT.md com encoding corrompido

### Problemas conhecidos
- `app/actions/inference_actions.ts` possivelmente desalinhado com schema atual
- `app/api/scrape/route.ts` não documentado no CLAUDE.md
- `lib/readiness.ts` e `lib/db/readiness.ts` — possível duplicata
- Motor de inferência (`lib/inference.ts`) em estado indeterminado (descontinuado no CLAUDE.md mas arquivo existe)
- API weather com fix pendente
- Encoding LF/CRLF misto entre arquivos (inofensivo mas inconsistente)