# Roadmap

Plano de evolução do Radiant. Prioridade definida por impacto operacional — o que muda a decisão do vendedor no dia do show vem primeiro.

---

## Fase 1.1 — Estabilização (pré-requisito para tudo)

Auditar código contra schema real do Supabase. Resolver arquivos mortos, imports quebrados, duplicatas. Garantir que tudo que está no repo compila e roda sem erro.

| Item | Descrição | Status |
|------|-----------|--------|
| Auditoria de código | Validar todos os arquivos contra schema real | pendente |
| Resolver duplicatas | `lib/readiness.ts` vs `lib/db/readiness.ts` | pendente |
| inference_actions.ts | Verificar alinhamento com schema atual | pendente |
| inference.ts | Decidir: remover ou manter como referência | pendente |
| scrape route | Documentar ou remover | pendente |
| Fix weather API | OpenWeather retornando erro | pendente |
| Revisão UI/UX | Consistência visual, cores, espaçamentos, responsividade | pendente |
| Estrutura de pastas | Avaliar reorganização de `lib/`, `utils/`, `types/` | pendente |

---

## Fase 2 — Operacional (impacto direto na decisão de venda)

### Prioridade alta

**Home funcional** — Calendário 10 dias, shows agendados, alertas, acesso rápido. Hoje a home não serve pra nada. É a primeira coisa que o vendedor abre.

**Resultado e peças vendidas** — Adicionar `pecas_levadas` e `pecas_vendidas` ao schema de shows. Sem isso não existe feedback loop real. Bloqueia a fase 3 inteira.

**Setlist.fm na página do show** — Rota já existe (`/api/setlistfm`). Falta exibir na página do show. Repertório esperado é fator de decisão de estampa.

### Prioridade média

**Ohara inline no perfil do artista** — Enriquecimento sem sair da página. Melhora o fluxo mas não bloqueia nenhuma feature.

**Histórico anterior ao app** — Recuperar shows pré-Notion por venue. Aumenta a base de dados pra ML. Depende de pesquisa manual.

### Prioridade baixa

**Múltiplas datas por evento** — Tabela `show_dates`. Só implementar com 5+ casos reais. Hoje o workaround (um show por data) funciona.

**Songkick API** — Aguardando aprovação. Monitoramento automático de shows futuros.

---

## Fase 3 — Inteligência (requer ~30 shows com resultado)

**ML com scikit-learn** — Regressão numérica sobre `pecas_vendidas`. Features: listeners, status_ingresso, capacidade, concorrencia, underground_score. Rodar localmente, exportar modelo, servir via API Python.

**Perfil de público** — Turista vs local (turista compra mais por urgência). Requer campo novo ou inferência por venue/artista.

**Previsão de gargalo de produção** — Cruzar volume sugerido com capacidade real de estamparia. Depende do ML funcional.

**Auto-enriquecimento de gêneros** — Job: MB tags + Last.fm → tabela genres automaticamente. Substitui seed manual.

---

## Princípios de priorização

1. **O que muda a decisão antes do show** vem antes do que analisa depois
2. **Feedback loop** (registrar resultado real) vem antes de predição
3. **Dados confiáveis** vêm antes de features que dependem deles
4. **Não implementar sem 5+ casos reais** — evitar over-engineering
5. **Opus decide, Claude Code executa, Sonnet ajusta**






666666666666666666666666666666666666666666666666666666666666







# RADIANT — ROADMAP

última atualização: 2026-03-30
versão atual: v0.6.3 / v0.9.0 em finalização

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

## v0.9.0 — UX/LAYOUT PASS (em finalização)

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
- ○ Dot de enriquecimento em todos os lugares que exibem nome de artista
- ○ NichoManager só visível em modo edição (fix duplicidade em artista detalhe)

### Antes de fechar v0.9.0
- ○ Import CSV (/dados) — planilha 2025 validada + enriquecimento no upload
- ○ Commit e tag v0.9.0

---

## PATCHES CONCLUÍDOS

- ✓ v0.6.2 — fix estoque/design: lista de shows filtrada por artist_id
- ✓ v0.6.3 — founded_year capturado e persistido do MusicBrainz life-span

---

## v0.9.1 — FILTROS E DADOS

- ○ Filtros de shows por estado operacional:
  ```
  a participar      → data futura + participou=true
  não participarei  → data futura + participou=false
  participados      → data passada + participou=true
  não participados  → data passada + participou=false
  todos             → cronológico completo
  ```
- ○ Lista "todos" com scroll automático para o dia de hoje
- ○ Import CSV histórico com validação + enriquecimento no upload (se não fechar no v0.9.0)

---

## v1.0.0 — RELEASE OPERACIONAL

Objetivo: sistema completo para uso solo em campo. Mobile como experiência primária.

- ○ Home completa (6 faces do dodecaedro — briefing operacional)
- ○ Ohara inline na página do artista (painel embutido, sem redirect)
- ○ Setlist.fm na página do show
- ○ Logo dodecaedro halftone (Illustrator — Bruno)
- ○ Braille Unicode expandido (backgrounds, transições)
- ○ Mobile: polimento completo (Agenda, /publicos, formulários)
- ○ Página /dados completa (import CSV, histórico, exportação)
- ○ OharaSearch global expandido (busca por artista, show, local, nicho, tag)
- ○ /publicos reestruturada (aguarda decisão Opus — ver abaixo)
- ○ Vercel vs localhost: investigar e resolver diferenças de build
- ○ Pretext: avaliar necessidade (trigger: 500+ shows ou reflow >100ms)

---

## v2.0.0 — MULTI-USER + ML

- ○ Supabase Auth + profiles (role: admin|editor|viewer) + RLS
- ○ ML regressão: scikit-learn quando ~30 shows com resultado_geral preenchido
  - Features: listeners, status_ingresso, capacidade, concorrencia, underground_score
  - Rodar local, exportar modelo, Radiant chama via API Python
- ○ RPG UI (exploração conceitual)
- ○ Mobile suporte completo

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
- nichoColor() semântica por gênero:
  metal = vermelho trevas, hc = amarelo, emo = roxo, pop = rosa, etc.
  (tensão: metal vs --status-neg vermelho — gerenciável por saturação/contexto)

### OharaSearch global (Fase D expandida)
Campo único no header, escopo selecionável: artista, show, local, nicho, tag.
Decisão: v0.9.0 Fase D ou v1.0?

---

## DÍVIDA TÉCNICA

- ~27 usos de var(--red)/var(--green) nos componentes via alias
  → migrar para --status-pos/--status-neg semânticos na Fase C/D
  → status: parcialmente migrado, residual nos componentes mais antigos
- `zona_risco` (bool) existe no schema mas é ignorado na UI
- `ultima_atualizacao` não está no pipe do artista (disponível no banco)
- Agenda (/agenda): funcional mas não polida — polimento em v1.0
- Artistas já enriquecidos antes de v0.6.3: founded_year = null até re-enrich
  → rodar /api/enrich-all para popular em massa quando conveniente

---

## SCHEMA — CAMPOS ADICIONADOS PÓS-v0.6.0

```sql
-- v0.6.3
artists: founded_year int

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