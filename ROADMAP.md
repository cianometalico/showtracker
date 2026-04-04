# RADIANT — ROADMAP

última atualização: 2026-04-03
versão atual: v0.9.1

---

## LEGENDA

```
✓  concluído
⏸  pausado (aguarda decisão)
○  pendente
🔴 bloqueado por dependência
```

Classificação de versão:
```
patch (0.x.Y)   bug fix, correção de dado, ajuste visual pontual
minor (0.X.0)   feature nova contida, extensão de existente
major (X.0.0)   mudança arquitetural, quebra de contrato
```

Modelo de trabalho:
```
Opus    → decisões arquiteturais e conceituais
Sonnet  → instruções para Claude Code, planejamento
Claude Code → execução de arquivos
Bruno   → testes no browser, decisões operacionais
```

---

## v0.9.0 — UX/LAYOUT PASS ✓ CONCLUÍDA

### Fase A — Fundação visual ✓
- ✓ Paleta + tokens CSS (cyan, amber, status gradient, text, surfaces)
- ✓ Tipografia (IBM Plex Mono + Instrument Serif — substituiu Cinzel, JetBrains Mono)
- ✓ Superfícies (surface-raw, surface-raised, surface-enriched)
- ✓ Remoção de lime, red antigo, glifos I Ching e funcionais

### Fase B — Indicadores ✓
- ✓ Dissolução de glifos (I Ching nav + funcionais)
- ✓ Indicadores .bodycore (dot sólido amber = enriquecido, dot outline = pendente)
- ✓ nichoColor() exclusion zones (evita conflito com cyan/amber/status)
- ✓ nichoColor() propagação descendente (nicho → artista → show → derivado)
- ✓ Ohara visual (ambiente amber em /ohara, labels amber nas origens de dado)
- ✓ OharaSearch: borda amber em candidatos MB
- ✓ Países: sigla → nome nativo (pt-BR (nativo)), lookup lib/countries.ts

### Fase C — Layout ✓
- ✓ Show detalhe: nome ∥ venue, lineup expandido, stats em linha, weather no pipe
- ✓ Artista detalhe: nichos ∥ tags lado a lado, header pipe
- ✓ Listas reestruturadas (shows, artistas, locais, públicos)
- ✓ Nav: horizontal desktop + bottom bar mobile, ícones SVG inline, popover "Mais"
- ✓ founded_year no pipe do artista
- ✓ Limpeza /publicos (textos redundantes, contador gêneros condicional)

### Fase D — Extras ✓
- ✓ Metadata pipe auditado em todas as páginas de detalhe
- ✓ TerminalSpinner (Braille Unicode, components/terminal-spinner.tsx)
- ✓ EnrichmentDot global (dot amber = enriquecido, dot outline muted = pendente)
- ✓ NichoManager só visível em modo edição (fix duplicidade em artista detalhe)
- ✓ Import CSV/XLSX (/dados) — unified import flow com enriquecimento
- ✓ Campo shows.tour adicionado ao schema

---

## PATCHES CONCLUÍDOS

- ✓ v0.6.2 — fix estoque/design: lista de shows filtrada por artist_id
- ✓ v0.6.3 — founded_year capturado e persistido do MusicBrainz life-span

---

## v0.9.1 — FILTROS E DADOS ✓ CONCLUÍDA

- ✓ Filtros de shows por estado operacional:
  ```
  a participar      → data futura + participou=true
  não participarei  → data futura + participou=false
  participados      → data passada + participou=true
  não participados  → data passada + participou=false
  todos             → cronológico completo
  ```
- ✓ Lista "todos" com scroll automático para o dia de hoje
- ✓ Contadores por estado no cabeçalho de shows
- ✓ OharaSearch removido do header global — busca por seção em cada lista de entidade

---

## v1.0.0 — RELEASE OPERACIONAL

Critérios de saída: dado limpo + 3 fluxos críticos mobile + home como briefing operacional.

### 1. Limpeza de dados + diagnóstico em /dados
- ○ Seção "diagnóstico": artistas duplicados, sem mbid, listeners zerados, shows sem resultado, venues sem subprefeitura
- ○ Excluir/merge artistas órfãos direto da interface

### 2. Ohara inline no perfil do artista
- ○ Painel embutido em `/artistas/[id]` — sem redirecionamento para `/ohara`
- ○ Requer transformar em client component ou componente separado

### 3. Home como briefing operacional
- ○ Bloco "próximos shows": nome, venue, risco, público estimado, status de estoque
- ○ Sinalização visual de campos incompletos

### 4. Audit mobile — 3 fluxos críticos
- ○ (a) registrar resultado de show no campo
- ○ (b) consultar detalhe do show antes de sair de casa
- ○ (c) registrar movimentação de estoque
- ○ Touch targets, collapse de grids lado a lado, ações sem scroll profundo

### 5. Setlist.fm na página do show
- ○ Rota `/api/setlistfm` existe. Exibir usando mbid do artista com `ordem=1` (headliner)
- ○ Cache server-side com revalidação de 24h

### 6. /publicos — view "próximos shows por nicho"
- ○ Inversão de fluxo: nicho → artistas vinculados → próximos shows
- ○ Pergunta respondida: "quando vou encontrar esse público de novo?"

### Critérios verificáveis de saída
**Dado:** zero artistas duplicados; artistas com shows futuros têm mbid + listeners; todos venues com risco; /dados sem pendências críticas.
**Fluxo:** 3 fluxos críticos funcionam no mobile com feedback visual de sucesso/falha. Ohara inline sem redirecionamento.
**Velocidade:** "vale ir nesse show?" respondível em ≤2 toques da home. "quanto estoque tenho?" respondível em ≤2 toques de qualquer show.

---

## v2.0.0 — MULTI-USER + ML

- ○ Supabase Auth + tabela `profiles` (role: admin|editor|viewer) + RLS
- ○ nichoColor() semântico por gênero (metal=vermelho trevas, hc=amarelo, emo=roxo...)
- ○ Taxonomia hierárquica de nichos (aguarda decisão Opus — ver abaixo)
- ○ ML regressão: scikit-learn quando ~30 shows com resultado_geral preenchido
  - Features: listeners, status_ingresso, capacidade, concorrencia, underground_score
  - Rodar local, exportar modelo, Radiant chama via API Python
- ○ RPG UI (exploração conceitual)
- ○ Mobile suporte completo
- ○ Pretext (implementar quando: 500+ shows, ou 50+ nichos, ou reflow >100ms/frame)
- ○ Logo dodecaedro (dot-matrix halftone, opacidade uniforme)
- ○ Songkick API (aguardando aprovação)
- ○ Múltiplas datas por evento: tabela `show_dates` — não antes de 5+ casos reais

---

## DECISÕES PENDENTES (Opus)

### Nav mobile — comportamento "Mais"
Estado: implementado como popover. Validar em dispositivo real antes de v1.0.

### /publicos — reestruturação conceitual
Aguarda Opus para fechar:
- Taxonomia de nicho: schema novo vs campos jsonb flexíveis
  (origens, época, cena, viés alt/default, descritores)
- Nomenclatura: nome livre vs composto estruturado
- Arquitetura do Ọrúnmilà (processador de tags MB/Last.fm)
  → inferir gênero macro, subgêneros, descritores de público
  → separar grupo-gênero de grupo-descritor
  → alimentar nichoColor() semântica por gênero

---

## DÍVIDA TÉCNICA

- ~27 usos de var(--red)/var(--green) nos componentes via alias
  → migrar para --status-pos/--status-neg semânticos
  → status: parcialmente migrado, residual nos componentes mais antigos
- `zona_risco` (bool) existe no schema mas é ignorado na UI
- `ultima_atualizacao` não está no pipe do artista (disponível no banco)
- Agenda (/agenda): funcional mas não polida — polimento em v1.0
- Artistas enriquecidos antes de v0.6.3: founded_year = null até re-enrich
  → rodar /api/enrich-all para popular em massa quando conveniente

---

## SCHEMA — CAMPOS ADICIONADOS PÓS-v0.6.0

```sql
-- v0.6.3
artists: founded_year int

-- v0.9.0
shows: tour text (nullable)

-- já existia no banco, não precisou migration:
shows: clima_temp int
```

---

## APIS EXTERNAS

```
MusicBrainz   ativo — mbid, life-span, tags, tipo
Last.fm       ativo — listeners, tags
Wikipedia     ativo — bio
Setlist.fm    ativo — histórico de setlists (rota existe, UI pendente)
Discogs       ativo — discografia
OpenWeather   ativo — previsão 5 dias (clima_estimado + clima_temp)
Songkick      aguardando aprovação de API key
```
