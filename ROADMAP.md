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