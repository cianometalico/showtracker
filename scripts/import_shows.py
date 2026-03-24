#!/usr/bin/env python3
"""
SHOWTRACKER — Import Script v0.1
Lê dados_notion_lista_registrada_shows.xlsx e gera SQL de inserção.

Uso:
  python3 import_shows.py > import_data.sql

Dependências:
  pip install pandas openpyxl --break-system-packages
"""

import pandas as pd
import re
import unicodedata
import uuid
from datetime import datetime

# ── Helpers ──────────────────────────────────────────────────

def gen_id():
    return str(uuid.uuid4())

def canonico(nome):
    """Normaliza nome para busca: lowercase, sem acentos, sem pontuação."""
    if not nome:
        return ''
    nfkd = unicodedata.normalize('NFKD', nome)
    sem_acento = ''.join(c for c in nfkd if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9\s]', '', sem_acento.lower()).strip()

def sql_str(v):
    if v is None:
        return 'NULL'
    return "'" + str(v).replace("'", "''") + "'"

def sql_bool(v):
    return 'TRUE' if v else 'FALSE'

def map_status_ingresso(expectativa):
    mapping = {
        'expectativa alta':   'sold_out',
        'expectativa média':  'intermediario',
        'expectativa media':  'intermediario',
        'expectativa baixa':  'mal_vendido',
        'expectativa nula':   'nao_participei',
    }
    if pd.isna(expectativa):
        return 'nao_participei'
    return mapping.get(expectativa.strip().lower(), 'intermediario')

def map_resultado(resultado):
    if pd.isna(resultado):
        return None
    mapping = {
        'sucesso total (vendas)': 'sucesso_total',
        'sucesso (vendas)':       'sucesso',
        'médio (vendas)':         'medio',
        'medio (vendas)':         'medio',
        'fracasso (vendas)':      'fracasso',
    }
    return mapping.get(resultado.strip().lower())

# ── Parser de Artistas ────────────────────────────────────────

def parse_artistas(raw):
    """
    Retorna: {
      nome_evento: str | None,
      artistas: [{ nome, billing_order }],
      is_festival: bool
    }

    Padrões suportados:
      EVENTO (A1 / A2 / A3)           → festival com nome
      A @ EVENTO                       → artista em evento nomeado
      A1 / A2 / A3                     → lineup sem nome de evento
      A1 & A2 | A1 e A2               → co-headliners (billing_order=1 ambos)
      A1 + A2                          → headliner + abertura
      A solo                           → artista único
    """
    if pd.isna(raw):
        return {'nome_evento': None, 'artistas': [], 'is_festival': False}

    raw = raw.strip()

    # Padrão: EVENTO (A1 / A2 / A3)
    m = re.match(r'^(.+?)\s*\((.+)\)\s*$', raw)
    if m:
        nome_evento = m.group(1).strip()
        lineup_str  = m.group(2).strip()
        artistas_raw = [a.strip() for a in re.split(r'\s*/\s*', lineup_str) if a.strip()]
        artistas = [{'nome': a, 'billing_order': i+1} for i, a in enumerate(artistas_raw)]
        return {
            'nome_evento': nome_evento,
            'artistas':    artistas,
            'is_festival': len(artistas) >= 3
        }

    # Padrão: A @ EVENTO
    m = re.match(r'^(.+?)\s*@\s*(.+)$', raw)
    if m:
        artista    = m.group(1).strip()
        nome_evento = m.group(2).strip()
        return {
            'nome_evento': nome_evento,
            'artistas':    [{'nome': artista, 'billing_order': 1}],
            'is_festival': False
        }

    # Co-headliners: A1 & A2 ou A1 e A2 (sem barras)
    if '/' not in raw and (' & ' in raw or re.search(r'\se\s', raw)):
        partes = re.split(r'\s+(?:&|e)\s+', raw, maxsplit=1)
        if len(partes) == 2:
            artistas = [
                {'nome': partes[0].strip(), 'billing_order': 1},
                {'nome': partes[1].strip(), 'billing_order': 1},
            ]
            return {'nome_evento': None, 'artistas': artistas, 'is_festival': False}

    # Lineup com barras: A1 / A2 / A3
    if '/' in raw:
        partes = [p.strip() for p in raw.split('/') if p.strip()]
        artistas = [{'nome': a, 'billing_order': i+1} for i, a in enumerate(partes)]
        return {
            'nome_evento': None,
            'artistas':    artistas,
            'is_festival': len(artistas) >= 3
        }

    # Artista solo
    return {
        'nome_evento': None,
        'artistas':    [{'nome': raw, 'billing_order': 1}],
        'is_festival': False
    }

# ── Main ─────────────────────────────────────────────────────

def main():
    df = pd.read_excel('/mnt/project/dados_notion_lista_registrada_shows.xlsx')

    # Dicts para deduplicar artistas e venues
    artists_map = {}   # nome_canonico → {id, nome, ...}
    venues_map  = {}   # nome_canonico → {id, nome}

    shows_rows       = []
    show_artists_rows = []

    for _, row in df.iterrows():
        data_raw     = row['Data']
        local_raw    = row['Local'] if not pd.isna(row.get('Local', float('nan'))) else None
        artista_raw  = row['Artista/Banda']
        expectativa  = row.get('Expectativa')
        resultado    = row.get('Resultado')

        # Parse data
        if pd.isna(data_raw):
            continue
        if hasattr(data_raw, 'date'):
            data_str = data_raw.date().isoformat()
        else:
            data_str = str(data_raw)[:10]

        # Parse artistas
        parsed      = parse_artistas(artista_raw)
        nome_evento = parsed['nome_evento']
        artistas    = parsed['artistas']

        # Status ingresso + participou
        status_ing = map_status_ingresso(expectativa)
        participou = status_ing != 'nao_participei'
        resultado_val = map_resultado(resultado)

        # Venue
        venue_id = None
        if local_raw:
            vkey = canonico(str(local_raw))
            if vkey not in venues_map:
                venues_map[vkey] = {'id': gen_id(), 'nome': str(local_raw).strip()}
            venue_id = venues_map[vkey]['id']

        # Show
        show_id = gen_id()
        shows_rows.append({
            'id':             show_id,
            'venue_id':       venue_id,
            'data':           data_str,
            'nome_evento':    nome_evento,
            'status_ingresso': status_ing,
            'participou':     participou,
            'resultado_geral': resultado_val,
        })

        # Artistas
        for a in artistas:
            akey = canonico(a['nome'])
            if not akey:
                continue
            if akey not in artists_map:
                artists_map[akey] = {
                    'id':            gen_id(),
                    'nome':          a['nome'].strip(),
                    'nome_canonico': akey,
                }
            show_artists_rows.append({
                'show_id':      show_id,
                'artist_id':    artists_map[akey]['id'],
                'billing_order': a['billing_order'],
            })

    # ── OUTPUT SQL ──

    print("-- ============================================================")
    print("-- SHOWTRACKER — Import histórico da planilha Notion")
    print(f"-- Gerado em: {datetime.now().isoformat()[:19]}")
    print(f"-- {len(shows_rows)} shows | {len(artists_map)} artistas | {len(venues_map)} venues novos")
    print("-- ============================================================")
    print()
    print("BEGIN;")
    print()

    # Venues novos (que não estão no seed)
    print("-- ── VENUES (novos, não presentes no seed) ──")
    print("-- Atenção: venues do seed já existem pelo nome. Estes são os não mapeados.")
    print("-- Revise manualmente e ajuste capacidade/zona antes de rodar.")
    print()
    for v in venues_map.values():
        print(
            f"INSERT INTO venues (id, nome, cidade) VALUES "
            f"({sql_str(v['id'])}, {sql_str(v['nome'])}, 'São Paulo') "
            f"ON CONFLICT DO NOTHING;"
        )

    print()
    print("-- ── ARTISTS ──")
    print("-- Todos criados com dados mínimos. Enriquecer via MusicBrainz depois.")
    print()
    for a in artists_map.values():
        print(
            f"INSERT INTO artists (id, nome, nome_canonico) VALUES "
            f"({sql_str(a['id'])}, {sql_str(a['nome'])}, {sql_str(a['nome_canonico'])}) "
            f"ON CONFLICT DO NOTHING;"
        )

    print()
    print("-- ── SHOWS ──")
    print()
    for s in shows_rows:
        venue_ref = sql_str(s['venue_id'])
        nome_ev   = sql_str(s['nome_evento'])
        resultado = sql_str(s['resultado_geral']) if s['resultado_geral'] else 'NULL'
        print(
            f"INSERT INTO shows "
            f"(id, venue_id, data, nome_evento, status_ingresso, participou, resultado_geral) VALUES ("
            f"{sql_str(s['id'])}, "
            f"{venue_ref}, "
            f"{sql_str(s['data'])}, "
            f"{nome_ev}, "
            f"'{s['status_ingresso']}', "
            f"{sql_bool(s['participou'])}, "
            f"{resultado});"
        )

    print()
    print("-- ── SHOW_ARTISTS ──")
    print()
    for sa in show_artists_rows:
        print(
            f"INSERT INTO show_artists (show_id, artist_id, billing_order) VALUES ("
            f"{sql_str(sa['show_id'])}, "
            f"{sql_str(sa['artist_id'])}, "
            f"{sa['billing_order']}) "
            f"ON CONFLICT DO NOTHING;"
        )

    print()
    print("COMMIT;")
    print()
    print("-- ── RESUMO ──")
    print(f"-- Shows inseridos:       {len(shows_rows)}")
    print(f"-- Artistas criados:      {len(artists_map)}")
    print(f"-- Venues referenciados:  {len(venues_map)}")
    print(f"-- Linhas show_artists:   {len(show_artists_rows)}")

    # Sumário no stderr para inspeção
    import sys
    print("\n=== PARSE PREVIEW (primeiros 15 shows) ===", file=sys.stderr)
    for s in shows_rows[:15]:
        artistas_deste = [sa['artist_id'] for sa in show_artists_rows if sa['show_id'] == s['id']]
        nomes = [a['nome'] for a in artists_map.values() if a['id'] in artistas_deste]
        print(f"  {s['data']} | {s['nome_evento'] or '—'} | {', '.join(nomes)} | {s['status_ingresso']} | {s['resultado_geral']}", file=sys.stderr)

if __name__ == '__main__':
    main()
