export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      artist_descriptors: {
        Row: {
          artist_id: string
          descriptor: string
        }
        Insert: {
          artist_id: string
          descriptor: string
        }
        Update: {
          artist_id?: string
          descriptor?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_descriptors_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_nichos: {
        Row: {
          artist_id: string
          nicho_id: string
          score: number | null
        }
        Insert: {
          artist_id: string
          nicho_id: string
          score?: number | null
        }
        Update: {
          artist_id?: string
          nicho_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_nichos_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_nichos_nicho_id_fkey"
            columns: ["nicho_id"]
            isOneToOne: false
            referencedRelation: "nichos"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_similar: {
        Row: {
          artist_id: string
          score: number | null
          similar_mbid: string | null
          similar_name: string
        }
        Insert: {
          artist_id: string
          score?: number | null
          similar_mbid?: string | null
          similar_name: string
        }
        Update: {
          artist_id?: string
          score?: number | null
          similar_mbid?: string | null
          similar_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_similar_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          abertura_experimental: number | null
          commodificacao: number | null
          cor_dominante_override: string[] | null
          created_at: string | null
          energia: number | null
          estetica_override: string[] | null
          genre_id: string | null
          geracao_override: string[] | null
          id: string
          lastfm_listeners: number | null
          letramento: number | null
          mbid: string | null
          nome: string
          pais: string | null
          receptividade_autoral: number | null
          similar_artists: Json | null
          tags_behavioral: Json | null
          tags_editorial: Json | null
          tipo_nostalgia_override: string[] | null
          ultima_atualizacao: string | null
          wikipedia_url: string | null
        }
        Insert: {
          abertura_experimental?: number | null
          commodificacao?: number | null
          cor_dominante_override?: string[] | null
          created_at?: string | null
          energia?: number | null
          estetica_override?: string[] | null
          genre_id?: string | null
          geracao_override?: string[] | null
          id?: string
          lastfm_listeners?: number | null
          letramento?: number | null
          mbid?: string | null
          nome: string
          pais?: string | null
          receptividade_autoral?: number | null
          similar_artists?: Json | null
          tags_behavioral?: Json | null
          tags_editorial?: Json | null
          tipo_nostalgia_override?: string[] | null
          ultima_atualizacao?: string | null
          wikipedia_url?: string | null
        }
        Update: {
          abertura_experimental?: number | null
          commodificacao?: number | null
          cor_dominante_override?: string[] | null
          created_at?: string | null
          energia?: number | null
          estetica_override?: string[] | null
          genre_id?: string | null
          geracao_override?: string[] | null
          id?: string
          lastfm_listeners?: number | null
          letramento?: number | null
          mbid?: string | null
          nome?: string
          pais?: string | null
          receptividade_autoral?: number | null
          similar_artists?: Json | null
          tags_behavioral?: Json | null
          tags_editorial?: Json | null
          tipo_nostalgia_override?: string[] | null
          ultima_atualizacao?: string | null
          wikipedia_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artists_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      designs: {
        Row: {
          artist_id: string
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          artist_id: string
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          artist_id?: string
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "designs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          created_at: string | null
          descritores: Json | null
          id: string
          nome: string
          zona: string | null
        }
        Insert: {
          created_at?: string | null
          descritores?: Json | null
          id?: string
          nome: string
          zona?: string | null
        }
        Update: {
          created_at?: string | null
          descritores?: Json | null
          id?: string
          nome?: string
          zona?: string | null
        }
        Relationships: []
      }
      nichos: {
        Row: {
          abertura_experimental: number | null
          coesao: number | null
          commodificacao: number | null
          concorrencia_merch: string | null
          cor: string | null
          cor_dominante: string[] | null
          corporalidade: Json | null
          created_at: string | null
          descricao: string | null
          descritores: Json | null
          energia: number | null
          estetica: string[] | null
          faixa_etaria: string | null
          fator_compra: string[] | null
          geracao: string[] | null
          id: string
          identidade_visual: number | null
          letramento: number | null
          maturidade: number | null
          mentalidade: Json | null
          nome: string
          receptividade_autoral: number | null
          tags: Json | null
          tipo_nostalgia: string[] | null
          underground_score: number | null
        }
        Insert: {
          abertura_experimental?: number | null
          coesao?: number | null
          commodificacao?: number | null
          concorrencia_merch?: string | null
          cor?: string | null
          cor_dominante?: string[] | null
          corporalidade?: Json | null
          created_at?: string | null
          descricao?: string | null
          descritores?: Json | null
          energia?: number | null
          estetica?: string[] | null
          faixa_etaria?: string | null
          fator_compra?: string[] | null
          geracao?: string[] | null
          id?: string
          identidade_visual?: number | null
          letramento?: number | null
          maturidade?: number | null
          mentalidade?: Json | null
          nome: string
          receptividade_autoral?: number | null
          tags?: Json | null
          tipo_nostalgia?: string[] | null
          underground_score?: number | null
        }
        Update: {
          abertura_experimental?: number | null
          coesao?: number | null
          commodificacao?: number | null
          concorrencia_merch?: string | null
          cor?: string | null
          cor_dominante?: string[] | null
          corporalidade?: Json | null
          created_at?: string | null
          descricao?: string | null
          descritores?: Json | null
          energia?: number | null
          estetica?: string[] | null
          faixa_etaria?: string | null
          fator_compra?: string[] | null
          geracao?: string[] | null
          id?: string
          identidade_visual?: number | null
          letramento?: number | null
          maturidade?: number | null
          mentalidade?: Json | null
          nome?: string
          receptividade_autoral?: number | null
          tags?: Json | null
          tipo_nostalgia?: string[] | null
          underground_score?: number | null
        }
        Relationships: []
      }
      show_artists: {
        Row: {
          artist_id: string
          faz_estampa: boolean | null
          ordem: number
          show_id: string
        }
        Insert: {
          artist_id: string
          faz_estampa?: boolean | null
          ordem?: number
          show_id: string
        }
        Update: {
          artist_id?: string
          faz_estampa?: boolean | null
          ordem?: number
          show_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_artists_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          clima_estimado: string | null
          concorrencia: string | null
          created_at: string | null
          data: string
          fiscalizacao_override: string | null
          id: string
          legado: boolean | null
          nome_evento: string | null
          observacoes: string | null
          participou: boolean | null
          pecas_levadas: number | null
          pecas_vendidas: number | null
          publico_estimado: number | null
          publico_estimado_manual: boolean | null
          resultado_geral: string | null
          singularidades: Json | null
          source_url: string | null
          status_ingresso: string | null
          tipo_venue_override: string | null
          venue_id: string | null
        }
        Insert: {
          clima_estimado?: string | null
          concorrencia?: string | null
          created_at?: string | null
          data: string
          fiscalizacao_override?: string | null
          id?: string
          legado?: boolean | null
          nome_evento?: string | null
          observacoes?: string | null
          participou?: boolean | null
          pecas_levadas?: number | null
          pecas_vendidas?: number | null
          publico_estimado?: number | null
          publico_estimado_manual?: boolean | null
          resultado_geral?: string | null
          singularidades?: Json | null
          source_url?: string | null
          status_ingresso?: string | null
          tipo_venue_override?: string | null
          venue_id?: string | null
        }
        Update: {
          clima_estimado?: string | null
          concorrencia?: string | null
          created_at?: string | null
          data?: string
          fiscalizacao_override?: string | null
          id?: string
          legado?: boolean | null
          nome_evento?: string | null
          observacoes?: string | null
          participou?: boolean | null
          pecas_levadas?: number | null
          pecas_vendidas?: number | null
          publico_estimado?: number | null
          publico_estimado_manual?: boolean | null
          resultado_geral?: string | null
          singularidades?: Json | null
          source_url?: string | null
          status_ingresso?: string | null
          tipo_venue_override?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shows_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string | null
          design_id: string
          id: string
          observacoes: string | null
          quantidade: number
          show_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          design_id: string
          id?: string
          observacoes?: string | null
          quantidade: number
          show_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          design_id?: string
          id?: string
          observacoes?: string | null
          quantidade?: number
          show_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "design_stock"
            referencedColumns: ["design_id"]
          },
          {
            foreignKeyName: "stock_movements_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      subprefeituras: {
        Row: {
          created_at: string | null
          fonte_legal: string | null
          id: string
          nome: string
          notas: string | null
          operacao_delegada: boolean
          perfil: string
          risco_base: string
          zona: string
        }
        Insert: {
          created_at?: string | null
          fonte_legal?: string | null
          id?: string
          nome: string
          notas?: string | null
          operacao_delegada?: boolean
          perfil: string
          risco_base: string
          zona: string
        }
        Update: {
          created_at?: string | null
          fonte_legal?: string | null
          id?: string
          nome?: string
          notas?: string | null
          operacao_delegada?: boolean
          perfil?: string
          risco_base?: string
          zona?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          bairro: string | null
          capacidade_praticavel: number | null
          cidade: string
          created_at: string | null
          endereco: string | null
          id: string
          lat: number | null
          lng: number | null
          nome: string
          risco_fiscalizacao: string | null
          subprefeitura_id: string | null
          tipo_default: string | null
          zona_risco: boolean | null
        }
        Insert: {
          bairro?: string | null
          capacidade_praticavel?: number | null
          cidade?: string
          created_at?: string | null
          endereco?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          nome: string
          risco_fiscalizacao?: string | null
          subprefeitura_id?: string | null
          tipo_default?: string | null
          zona_risco?: boolean | null
        }
        Update: {
          bairro?: string | null
          capacidade_praticavel?: number | null
          cidade?: string
          created_at?: string | null
          endereco?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          nome?: string
          risco_fiscalizacao?: string | null
          subprefeitura_id?: string | null
          tipo_default?: string | null
          zona_risco?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_subprefeitura_id_fkey"
            columns: ["subprefeitura_id"]
            isOneToOne: false
            referencedRelation: "subprefeituras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      design_stock: {
        Row: {
          artist_id: string | null
          ativo: boolean | null
          design_id: string | null
          nome: string | null
          saldo_atual: number | null
          total_perdido: number | null
          total_produzido: number | null
          total_vendido: number | null
        }
        Relationships: [
          {
            foreignKeyName: "designs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      search_artists: {
        Args: { search_term: string }
        Returns: {
          abertura_experimental: number | null
          commodificacao: number | null
          cor_dominante_override: string[] | null
          created_at: string | null
          energia: number | null
          estetica_override: string[] | null
          genre_id: string | null
          geracao_override: string[] | null
          id: string
          lastfm_listeners: number | null
          letramento: number | null
          mbid: string | null
          nome: string
          pais: string | null
          receptividade_autoral: number | null
          similar_artists: Json | null
          tags_behavioral: Json | null
          tags_editorial: Json | null
          tipo_nostalgia_override: string[] | null
          ultima_atualizacao: string | null
          wikipedia_url: string | null
        }[]
      }
      search_designs: {
        Args: { search_term: string }
        Returns: {
          artist_id: string
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
        }[]
      }
      search_venues: {
        Args: { search_term: string }
        Returns: {
          cidade: string
          id: string
          nome: string
        }[]
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
