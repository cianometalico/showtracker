import type { Database, Tables } from './database'

export type { Database, Tables }

export type Show = Tables<'shows'>
export type ShowInsert = Database['public']['Tables']['shows']['Insert']
export type Artist = Tables<'artists'>
export type Venue = Tables<'venues'>
export type Genre = Tables<'genres'>
export type Nicho = Tables<'nichos'>
export type ShowArtist = Tables<'show_artists'>

export type ShowWithRelations = Show & {
  venue: Venue
  show_artists: (ShowArtist & { artists: Artist })[]
}

export type ShowListItem = Pick<
  Show,
  'id' | 'data' | 'nome_evento' | 'status_ingresso' | 'publico_estimado' | 'participou'
> & {
  venue: Pick<Venue, 'id' | 'nome'>
}
