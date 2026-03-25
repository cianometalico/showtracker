# RADIANT — AUDIT.md
> Gerado em 2026-03-24. Diagnóstico apenas — nenhuma correção aplicada.

---

## 1. ARQUIVOS MORTOS

### `lib/db/readiness.ts`
Não está exportado de `lib/db/index.ts` (que só exporta `./shows` e `./artists`).
Nenhum arquivo do projeto o importa diretamente via path — está efetivamente isolado.

### `app/shows/[id]/weather-widget.tsx`
Existe em paralelo com `app/shows/[id]/weather-block.tsx`. Ambos fazem fetch de `/api/weather` e exibem previsão. O `[id]/page.tsx` usa `weather-widget.tsx`, mas `show-client.tsx` (que é o componente principal da página de detalhe) não o importa. O `weather-block.tsx` importa `updateClimaFromWeather` de `./actions` (função inexistente — ver seção 4). Um dos dois está morto ou incompleto.

---

## 2. SCHEMA vs CÓDIGO

### Campos no código que NÃO estão no schema documentado no CLAUDE.md

| Tabela | Campo | Onde aparece |
|--------|-------|--------------|
| `shows` | `fiscalizacao` (bool) | `lib/inference.ts`, `inference_actions.ts` |
| `shows` | `fiscalizacao_score` (number) | `lib/inference.ts`, `inference_actions.ts` |
| `shows` | `risco_cancelamento` (bool) | `lib/inference.ts`, `inference_actions.ts` |
| `shows` | `qualidade_concorrencia` (number) | `inference_actions.ts`, `show-client.tsx` |
| `shows` | `motivo_urgencia` (string) | `lib/inference.ts`, `inference_actions.ts` |
| `shows` | `concorrentes` (string) | `show-client.tsx` (ShowData interface) |
| `shows` | `resultado_notas` (string) | `show-client.tsx` (ShowData interface) |
| `shows` | `designs` (relation) | `lib/db/shows.ts` query, `show-client.tsx` |
| `artists` | `propensao_compra` (number) | `lib/inference.ts`, `lib/readiness.ts`, `inference_actions.ts`, `lib/db/readiness.ts` |
| `artists` | `zona` (string) | `lib/inference.ts`, `lib/readiness.ts`, `inference_actions.ts` |
| `artists` | `genero_canonico` (string) | `lib/inference.ts`, `inference_actions.ts`, `show-client.tsx` |
| `artists` | `multiplicador_genero` (number) | `lib/inference.ts` (ArtistInput type) |
| `artists` | `primeira_vez_brasil` (bool) | `lib/readiness.ts`, `lib/db/readiness.ts`, `inference_actions.ts` |
| `artists` | `primeira_vez_brasil_confidence` | `lib/readiness.ts`, `lib/db/readiness.ts`, `inference_actions.ts` |
| `artists` | `data_provenance` (jsonb) | `lib/readiness.ts`, `lib/db/readiness.ts`, `inference_actions.ts` |
| `artists` | `musicbrainz_id` | `inference_actions.ts` (select e mapeamento para `mbid`) |
| `artists` | `nome_canonico` | `lib/db/artists.ts` (order, upsert conflict) |
| `artists` | `porte_fisico` | `lib/db/shows.ts` (select), `show-client.tsx` (Artist type) |
| `show_artists` | `billing_order` | `lib/db/shows.ts`, `lib/db/readiness.ts`, `inference_actions.ts`, `app/agenda/page.tsx`, `show-client.tsx` |
| `show_artists` | `percentual_publico` | `inference_actions.ts` (select) |
| `show_artists` | `fez_estampa` | `lib/db/shows.ts` (select) — o DB tem `faz_estampa` |
| `genres` | `multiplicador_propensao` | `inference_actions.ts` |
| `venues` | `capacidade` (plain, sem `_praticavel`) | `inference_actions.ts` (select 'capacidade') |
| `venues` | `zona` | `inference_actions.ts` (select 'zona') |

### Campos documentados no CLAUDE.md que nenhum arquivo referencia

| Tabela | Campo | Status |
|--------|-------|--------|
| `shows` | `legado` (bool) | Mencionado no CLAUDE.md (histórico importado) mas nunca lido no código |
| `shows` | `source_url` | Mencionado no CLAUDE.md, ausente do código |
| `artists` | `similar_artists` (jsonb) | No schema mas não usado em nenhuma query |
| `nichos` | tabela inteira | Usada via queries diretas com `(supabase as any)` sem type safety |
| `artist_nichos` | tabela inteira | Idem |
| `artist_similar` | tabela inteira | Idem |

### Divergência de valores: `status_ingresso`

CLAUDE.md documenta os valores do banco como:
```
sold out | bem vendido | mal vendido
```

Mas `lib/inference.ts` define o enum como:
```typescript
'sold_out' | 'ultimo_lote' | 'intermediario' | 'mal_vendido' | 'nao_participei'
```

Os arquivos de UI (`[id]/page.tsx`, `locais/[id]/page.tsx`) usam `"sold out"/"bem vendido"/"mal vendido"` nos labels, sugerindo que o banco tem os valores com espaço. Mas `inference_actions.ts` usa `'intermediario'` como fallback — valor que não existe no CLAUDE.md. Os dois mundos são incompatíveis.

---

## 3. DUPLICATAS

### `lib/readiness.ts` vs `lib/db/readiness.ts`
Funções distintas mas acopladas: `lib/readiness.ts` contém a lógica pura (`calculateReadinessScore`, `calcUrgencia`, types) e `lib/db/readiness.ts` importa dela e adiciona queries ao Supabase. O comentário na linha 1 de `lib/db/readiness.ts` diz `// Adicionar em lib/db/artists.ts (ou criar lib/db/readiness.ts se preferir separado)` — evidência de que o arquivo foi criado como rascunho e nunca integrado.

### `app/shows/[id]/weather-widget.tsx` vs `app/shows/[id]/weather-block.tsx`
Ambos:
- Fazem `fetch('/api/weather?lat=...&lng=...&data=...')`
- Exibem ícone e temperatura do clima
- Recebem `climaSalvo/climaAtual`, `lat`, `lng`, `data` como props

Diferença: `weather-block.tsx` tem estados mais ricos (salvo/idle/error/unavailable) e chama `updateClimaFromWeather` para persistir. `weather-widget.tsx` é mais simples (somente leitura). O `[id]/page.tsx` usa `weather-widget.tsx`. Nada usa `weather-block.tsx` com sucesso (import quebrado, ver seção 4).

---

## 4. IMPORTS QUEBRADOS

### `app/shows/[id]/weather-block.tsx` — linha 6
```typescript
import { updateClimaFromWeather } from './actions'
```
A função `updateClimaFromWeather` **não existe** em `app/shows/[id]/actions.ts`. O arquivo exporta: `updateShow`, `deleteShow`, `addArtistToShow`, `removeArtistFromShow`, `reorderArtist`, `searchArtists`, `searchVenues`.

### `app/shows/[id]/show-client.tsx` — linha 5
```typescript
import { updateContexto, updateResultado, toggleFezEstampa, addArtistToShow } from './actions'
```
`addArtistToShow` existe, mas `updateContexto`, `updateResultado` e `toggleFezEstampa` **não existem** em `app/shows/[id]/actions.ts`. O `show-client.tsx` é o componente principal da página de detalhe do show e não pode funcionar.

### `lib/utils.ts` — linha 1
```typescript
import type { ShowListItem, ShowWithRelations } from '@/types/database'
```
`ShowListItem` e `ShowWithRelations` **não são definidos** em `types/database.ts`. O arquivo só exporta `Database`, `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `CompositeTypes` e `Constants`.

### `lib/db/shows.ts` — linha 2
```typescript
import type { Show, ShowWithRelations, ShowListItem } from '@/types/database'
```
Nenhum desses tipos existe em `types/database.ts`.

### `lib/db/artists.ts` — linha 2
```typescript
import type { Artist } from '@/types/database'
```
`Artist` **não existe** em `types/database.ts`.

### `app/shows/[id]/inference-block.tsx` — linha 68 e 144
```typescript
<Link href={`/database/artistas/${artistId}`} ...>
```
A rota `/database/artistas/[id]` **não existe**. A rota correta é `/artistas/[id]`.

### `app/shows/[id]/show-history-block.tsx` — linhas 124, 133, 144, 209
```typescript
<Link href={`/database/artistas/${artistId}`} ...>
```
Mesmo problema: prefixo `/database/` inexistente no App Router do projeto.

---

## 5. ROTAS FANTASMA

### Rotas documentadas no CLAUDE.md que **não existem** no filesystem
Todas as rotas documentadas existem no filesystem. Nenhuma está faltando.

Exceção de nomenclatura:
- CLAUDE.md documenta `edit-venue-client.tsx` (hífen), mas o arquivo real é `edit_venue_client.tsx` (underline).

### Rotas no filesystem **não documentadas** no CLAUDE.md

| Arquivo | Observação |
|---------|------------|
| `app/shows/[id]/show-client.tsx` | Componente principal da detail page, não documentado |
| `app/shows/[id]/inference-block.tsx` | Bloco de inferência, não documentado |
| `app/shows/[id]/show-history-block.tsx` | Histórico Setlist.fm, não documentado (Fase 3 do CLAUDE.md) |
| `app/shows/[id]/weather-block.tsx` | Duplicata de weather-widget, não documentada |
| `app/shows/[id]/actions.ts` | Server actions do show detail, não documentado |
| `app/agenda/page.tsx` + `agenda-client.tsx` | Rota /agenda completa, não documentada |
| `app/generos/page.tsx` | Rota /generos (não é a mesma que /publicos/generos/[id]) |
| `app/api/scrape/route.ts` | API de scraping, não documentada |
| `app/api/artist-shows/route.ts` | API de shows por artista, não documentada |
| `app/actions/inference_actions.ts` | Server actions de inferência, não documentadas |
| `app/locais/[id]/venue-client.tsx` | Componente client do venue, não documentado |

---

## 6. DECISÕES CONTRADITÓRIAS

### Inferência "descontinuada" mas totalmente implementada
CLAUDE.md — Decisões de Design:
> "Inferência descontinuada — substituída por dados reais + ML futuro"

Código ativo que contradiz isso:
- `lib/inference.ts` (227 linhas) — motor de cálculo completo
- `lib/readiness.ts` (225 linhas) — sistema de score de prontidão para inferência
- `lib/db/readiness.ts` — queries para readiness
- `app/actions/inference_actions.ts` (266 linhas) — server actions chamando o motor
- `app/shows/[id]/inference-block.tsx` (212 linhas) — UI exposta ao usuário com botão "Calcular volume sugerido"

O sistema de inferência não está descontinuado — está implementado e exposto. Ou o CLAUDE.md está desatualizado, ou há código morto que não foi removido.

### `show-client.tsx` usa campos inexistentes no schema real
O componente `show-client.tsx` define a interface `ShowData` com campos:
- `concorrentes` — não está em `shows` (CLAUDE.md tem `concorrencia`)
- `qualidade_concorrencia` (number) — não está no schema documentado
- `fiscalizacao`, `risco_cancelamento`, `motivo_urgencia` — não estão no schema documentado
- `designs` (relation) — tabela `designs` não existe no schema

Se esses campos não estão no banco real, a página de detalhe do show (`show-client.tsx`) não funciona.

### `lib/db/shows.ts` usa campos errados na tabela `show_artists`
```typescript
// lib/db/shows.ts — consulta billing_order e fez_estampa
show_artists (
  billing_order, fez_estampa,
  artists ( id, nome, porte_fisico )
)
```
- `billing_order` → o schema real (database.ts) tem `ordem`
- `fez_estampa` → o schema real tem `faz_estampa`
- `porte_fisico` → não existe em artistas

### `lib/db/artists.ts` usa `nome_canonico`
```typescript
.order('nome_canonico')
.upsert(payload, { onConflict: 'nome_canonico' })
```
O campo `nome_canonico` não está em nenhum lugar: nem no CLAUDE.md, nem no `database.ts`, nem em qualquer query de outras partes do código. A coluna `artists.nome` é o que todos os outros arquivos usam.

---

## 7. TIPOS — `types/database.ts` vs schema real

### Tipos custom ausentes (importados mas não definidos)
Vários arquivos importam tipos que não existem em `database.ts`:

| Tipo importado | Importado por |
|----------------|---------------|
| `Show` | `lib/db/shows.ts` |
| `ShowWithRelations` | `lib/db/shows.ts`, `lib/utils.ts` |
| `ShowListItem` | `lib/db/shows.ts`, `lib/utils.ts` |
| `Artist` | `lib/db/artists.ts` |

O `database.ts` não define esses tipos compostos — apenas os tipos base do Supabase (Database, Tables, etc.).

### Colunas em `database.ts` que diferem do código real

**Tabela `show_artists`:**
- `database.ts` tem: `ordem`, `faz_estampa`
- Código usa: `billing_order`, `fez_estampa` (em vários arquivos)
- Conflito: `actions.ts` usa `ordem` nos updates; `lib/db/shows.ts` usa `billing_order` nos selects

**Tabela `shows` — colunas ausentes do `database.ts`:**
- `fiscalizacao`, `fiscalizacao_score`, `risco_cancelamento`, `qualidade_concorrencia`, `motivo_urgencia`
- `legado`, `source_url`
- `concorrencia` existe no database.ts mas como `string | null` — inference usa como número

**Tabela `shows` — colunas extras no `database.ts` (não no CLAUDE.md):**
- `fiscalizacao_override` (string | null)
- `publico_estimado_manual` (bool | null)
- `tipo_venue_override` (string | null)

**Tabela `artists` — colunas ausentes do `database.ts`:**
- `propensao_compra`, `zona`, `genero_canonico`, `musicbrainz_id`, `nome_canonico`, `porte_fisico`
- `primeira_vez_brasil`, `primeira_vez_brasil_confidence`, `data_provenance`

**Tabela `genres` — colunas ausentes do `database.ts`:**
- `multiplicador_propensao` (referenciado em `inference_actions.ts`)

**Tabela `venues` — colunas ausentes do `database.ts`:**
- `capacidade` (sem `_praticavel`), `zona`

### Tabelas inteiras ausentes do `database.ts`

As tabelas `nichos`, `artist_nichos`, `artist_similar` e `designs` existem no CLAUDE.md e são usadas via `(supabase as any)` no código mas não estão tipadas em `database.ts`.

---

## RESUMO EXECUTIVO

| Categoria | Severidade | Qtd |
|-----------|------------|-----|
| Imports quebrados (funções inexistentes) | CRÍTICO | 4 funções |
| Tipos importados inexistentes | ALTO | 4 tipos |
| Links com rota errada (`/database/artistas/`) | ALTO | 2 arquivos |
| Colunas usadas em código mas ausentes do `database.ts` | ALTO | ~20 |
| Colunas com nome diferente entre código e DB (billing_order vs ordem, etc.) | ALTO | 3 |
| Inferência "descontinuada" mas ativa e exposta na UI | MÉDIO | 5 arquivos |
| Rotas não documentadas no CLAUDE.md | BAIXO | 11 |
| Duplicatas funcionais (weather-widget vs weather-block) | BAIXO | 1 par |
| Arquivo isolado da lib/db (readiness.ts sem export) | BAIXO | 1 |
