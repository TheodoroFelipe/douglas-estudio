
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "clientes": {
                  Row: {
                    "atualizado_em": string,"cpf_cnpj": string | null,"criado_em": string,"criado_por": string | null,"email": string | null,"endereco": string | null,"id": string,"nome": string,"observacoes": string | null,"telefone": string | null,"tipo_pessoa": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"cpf_cnpj"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"email"?: string | null,"endereco"?: string | null,"id"?: string,"nome": string,"observacoes"?: string | null,"telefone"?: string | null,"tipo_pessoa"?: string
                  }
                  Update: {
                    "atualizado_em"?: string,"cpf_cnpj"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"email"?: string | null,"endereco"?: string | null,"id"?: string,"nome"?: string,"observacoes"?: string | null,"telefone"?: string | null,"tipo_pessoa"?: string
                  }
                  Relationships: [
                    
                  ]
                },"configuracoes": {
                  Row: {
                    "aliquota_iss_padrao": number | null,"atualizado_em": string,"atualizado_por": string | null,"cidade": string,"cnpj": string | null,"codigo_servico_padrao": string,"descricao_servico_padrao": string,"email": string | null,"endereco": string | null,"id": boolean,"inscricao_municipal": string | null,"logo_path": string | null,"nome_fantasia": string,"razao_social": string | null,"responsavel_assinatura": string | null,"telefone": string | null,"uf": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aliquota_iss_padrao"?: number | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"cidade"?: string,"cnpj"?: string | null,"codigo_servico_padrao"?: string,"descricao_servico_padrao"?: string,"email"?: string | null,"endereco"?: string | null,"id"?: boolean,"inscricao_municipal"?: string | null,"logo_path"?: string | null,"nome_fantasia"?: string,"razao_social"?: string | null,"responsavel_assinatura"?: string | null,"telefone"?: string | null,"uf"?: string
                  }
                  Update: {
                    "aliquota_iss_padrao"?: number | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"cidade"?: string,"cnpj"?: string | null,"codigo_servico_padrao"?: string,"descricao_servico_padrao"?: string,"email"?: string | null,"endereco"?: string | null,"id"?: boolean,"inscricao_municipal"?: string | null,"logo_path"?: string | null,"nome_fantasia"?: string,"razao_social"?: string | null,"responsavel_assinatura"?: string | null,"telefone"?: string | null,"uf"?: string
                  }
                  Relationships: [
                    
                  ]
                },"despesas": {
                  Row: {
                    "atualizado_em": string,"comprovante": string | null,"criado_em": string,"criado_por": string | null,"data": string,"descricao": string | null,"fornecedor": string | null,"id": string,"status": string,"tipo_despesa_id": string,"trabalho_id": string | null,"valor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"comprovante"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data"?: string,"descricao"?: string | null,"fornecedor"?: string | null,"id"?: string,"status"?: string,"tipo_despesa_id": string,"trabalho_id"?: string | null,"valor": number
                  }
                  Update: {
                    "atualizado_em"?: string,"comprovante"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data"?: string,"descricao"?: string | null,"fornecedor"?: string | null,"id"?: string,"status"?: string,"tipo_despesa_id"?: string,"trabalho_id"?: string | null,"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "despesas_tipo_despesa_id_fkey"
      columns: ["tipo_despesa_id"]
isOneToOne: false
      referencedRelation: "tipos_despesa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "despesas_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "trabalhos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "despesas_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "vw_conciliacao_trabalho"
      referencedColumns: ["trabalho_id"]
    },{
      foreignKeyName: "despesas_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "vw_resultado_trabalho"
      referencedColumns: ["trabalho_id"]
    }
                  ]
                },"notas_fiscais": {
                  Row: {
                    "aliquota_iss": number | null,"arquivo_pdf": string | null,"arquivo_xml": string | null,"atualizado_em": string,"chave_acesso": string,"codigo_servico": string,"criado_em": string,"criado_por": string | null,"data_competencia": string,"data_emissao": string,"descricao_servico": string,"id": string,"motivo_cancelamento": string | null,"nota_substituida_id": string | null,"numero": string,"status": string,"trabalho_id": string,"valor_servico": number
                  }
                  ComputedFields: never
                  Insert: {
                    "aliquota_iss"?: number | null,"arquivo_pdf"?: string | null,"arquivo_xml"?: string | null,"atualizado_em"?: string,"chave_acesso": string,"codigo_servico": string,"criado_em"?: string,"criado_por"?: string | null,"data_competencia": string,"data_emissao": string,"descricao_servico": string,"id"?: string,"motivo_cancelamento"?: string | null,"nota_substituida_id"?: string | null,"numero": string,"status"?: string,"trabalho_id": string,"valor_servico": number
                  }
                  Update: {
                    "aliquota_iss"?: number | null,"arquivo_pdf"?: string | null,"arquivo_xml"?: string | null,"atualizado_em"?: string,"chave_acesso"?: string,"codigo_servico"?: string,"criado_em"?: string,"criado_por"?: string | null,"data_competencia"?: string,"data_emissao"?: string,"descricao_servico"?: string,"id"?: string,"motivo_cancelamento"?: string | null,"nota_substituida_id"?: string | null,"numero"?: string,"status"?: string,"trabalho_id"?: string,"valor_servico"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "notas_fiscais_nota_substituida_id_fkey"
      columns: ["nota_substituida_id"]
isOneToOne: false
      referencedRelation: "notas_fiscais"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_nota_substituida_id_fkey"
      columns: ["nota_substituida_id"]
isOneToOne: false
      referencedRelation: "vw_conciliacao_trabalho"
      referencedColumns: ["nota_id"]
    },{
      foreignKeyName: "notas_fiscais_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "trabalhos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "vw_conciliacao_trabalho"
      referencedColumns: ["trabalho_id"]
    },{
      foreignKeyName: "notas_fiscais_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "vw_resultado_trabalho"
      referencedColumns: ["trabalho_id"]
    }
                  ]
                },"parcelas": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"criado_por": string | null,"id": string,"numero": number,"trabalho_id": string,"valor": number,"vencimento": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"numero": number,"trabalho_id": string,"valor": number,"vencimento": string
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"numero"?: number,"trabalho_id"?: string,"valor"?: number,"vencimento"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "parcelas_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "trabalhos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parcelas_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "vw_conciliacao_trabalho"
      referencedColumns: ["trabalho_id"]
    },{
      foreignKeyName: "parcelas_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "vw_resultado_trabalho"
      referencedColumns: ["trabalho_id"]
    }
                  ]
                },"perfis": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"id": string,"nome": string,"papel": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"id": string,"nome": string,"papel": string
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"id"?: string,"nome"?: string,"papel"?: string
                  }
                  Relationships: [
                    
                  ]
                },"recebimentos": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"criado_por": string | null,"data_recebimento": string,"forma_pagamento": string,"id": string,"observacoes": string | null,"parcela_id": string | null,"status": string,"taxa": number,"trabalho_id": string,"valor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"data_recebimento"?: string,"forma_pagamento": string,"id"?: string,"observacoes"?: string | null,"parcela_id"?: string | null,"status"?: string,"taxa"?: number,"trabalho_id": string,"valor": number
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"data_recebimento"?: string,"forma_pagamento"?: string,"id"?: string,"observacoes"?: string | null,"parcela_id"?: string | null,"status"?: string,"taxa"?: number,"trabalho_id"?: string,"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "recebimentos_parcela_id_fkey"
      columns: ["parcela_id"]
isOneToOne: false
      referencedRelation: "parcelas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_parcela_id_fkey"
      columns: ["parcela_id"]
isOneToOne: false
      referencedRelation: "vw_parcelas_status"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "trabalhos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "vw_conciliacao_trabalho"
      referencedColumns: ["trabalho_id"]
    },{
      foreignKeyName: "recebimentos_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "vw_resultado_trabalho"
      referencedColumns: ["trabalho_id"]
    }
                  ]
                },"recibos": {
                  Row: {
                    "ano": number,"arquivo_pdf": string | null,"atualizado_em": string,"criado_em": string,"criado_por": string | null,"data_emissao": string,"id": string,"motivo_cancelamento": string | null,"numero": number,"recebimento_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ano": number,"arquivo_pdf"?: string | null,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"data_emissao"?: string,"id"?: string,"motivo_cancelamento"?: string | null,"numero": number,"recebimento_id": string,"status"?: string
                  }
                  Update: {
                    "ano"?: number,"arquivo_pdf"?: string | null,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"data_emissao"?: string,"id"?: string,"motivo_cancelamento"?: string | null,"numero"?: number,"recebimento_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recibos_recebimento_id_fkey"
      columns: ["recebimento_id"]
isOneToOne: false
      referencedRelation: "recebimentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recibos_recebimento_id_fkey"
      columns: ["recebimento_id"]
isOneToOne: false
      referencedRelation: "vw_recebimentos"
      referencedColumns: ["id"]
    }
                  ]
                },"sequencia_recibos": {
                  Row: {
                    "ano": number,"atualizado_em": string,"ultimo_numero": number
                  }
                  ComputedFields: never
                  Insert: {
                    "ano": number,"atualizado_em"?: string,"ultimo_numero"?: number
                  }
                  Update: {
                    "ano"?: number,"atualizado_em"?: string,"ultimo_numero"?: number
                  }
                  Relationships: [
                    
                  ]
                },"tipos_despesa": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"classificacao": string,"criado_em": string,"criado_por": string | null,"id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"classificacao": string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"nome": string
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"classificacao"?: string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                },"trabalhos": {
                  Row: {
                    "atualizado_em": string,"cliente_id": string,"criado_em": string,"criado_por": string | null,"data_conclusao": string | null,"data_evento": string | null,"descricao": string,"id": string,"numero_contrato": string | null,"status": string,"tipo": string,"valor_total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"cliente_id": string,"criado_em"?: string,"criado_por"?: string | null,"data_conclusao"?: string | null,"data_evento"?: string | null,"descricao": string,"id"?: string,"numero_contrato"?: string | null,"status"?: string,"tipo": string,"valor_total": number
                  }
                  Update: {
                    "atualizado_em"?: string,"cliente_id"?: string,"criado_em"?: string,"criado_por"?: string | null,"data_conclusao"?: string | null,"data_evento"?: string | null,"descricao"?: string,"id"?: string,"numero_contrato"?: string | null,"status"?: string,"tipo"?: string,"valor_total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "trabalhos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "vw_alertas": {
                  Row: {
                    "data_referencia": string | null,"descricao": string | null,"referencia_id": string | null,"tipo": string | null,"trabalho_descricao": string | null,"trabalho_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"vw_conciliacao_trabalho": {
                  Row: {
                    "cliente_id": string,"cliente_nome": string,"data_conclusao": string | null,"data_evento": string | null,"descricao": string,"nota_divergente": boolean | null,"nota_id": string | null,"nota_numero": string | null,"nota_pendente": boolean | null,"parcelas_vencidas": number | null,"recebimentos_sem_recibo": number | null,"saldo_a_receber": number | null,"status": string,"tem_nota": boolean | null,"tipo": string,"total_recebido": number | null,"trabalho_id": string,"valor_nota": number | null,"valor_total": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "trabalhos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    }
                  ]
                },"vw_consolidado_mensal": {
                  Row: {
                    "despesas_diretas": number | null,"despesas_indiretas": number | null,"faturado_em_nota": number | null,"mes": string | null,"recebido": number | null,"resultado": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"vw_despesas_por_tipo_mensal": {
                  Row: {
                    "classificacao": string | null,"mes": string | null,"quantidade": number | null,"tipo_despesa_id": string | null,"tipo_nome": string | null,"total": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"vw_parcelas_status": {
                  Row: {
                    "id": string,"numero": number,"saldo": number | null,"status": string | null,"total_parcelas": number | null,"trabalho_id": string,"valor": number,"valor_pago": number | null,"vencimento": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "parcelas_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "trabalhos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parcelas_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "vw_conciliacao_trabalho"
      referencedColumns: ["trabalho_id"]
    },{
      foreignKeyName: "parcelas_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "vw_resultado_trabalho"
      referencedColumns: ["trabalho_id"]
    }
                  ]
                },"vw_recebimentos": {
                  Row: {
                    "cliente_id": string,"cliente_nome": string,"criado_em": string,"data_recebimento": string,"forma_pagamento": string,"id": string,"observacoes": string | null,"parcela_id": string | null,"parcela_numero": number | null,"recibo_ano": number | null,"recibo_id": string | null,"recibo_numero": number | null,"recibo_pdf": string | null,"status": string,"taxa": number,"total_parcelas": number | null,"trabalho_descricao": string,"trabalho_id": string,"trabalho_status": string,"valor": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "recebimentos_parcela_id_fkey"
      columns: ["parcela_id"]
isOneToOne: false
      referencedRelation: "parcelas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_parcela_id_fkey"
      columns: ["parcela_id"]
isOneToOne: false
      referencedRelation: "vw_parcelas_status"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "trabalhos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "vw_conciliacao_trabalho"
      referencedColumns: ["trabalho_id"]
    },{
      foreignKeyName: "recebimentos_trabalho_id_fkey"
      columns: ["trabalho_id"]
isOneToOne: false
      referencedRelation: "vw_resultado_trabalho"
      referencedColumns: ["trabalho_id"]
    },{
      foreignKeyName: "trabalhos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    }
                  ]
                },"vw_resultado_trabalho": {
                  Row: {
                    "cliente_id": string,"cliente_nome": string,"data_conclusao": string | null,"data_evento": string | null,"descricao": string,"despesas_diretas": number | null,"despesas_lancadas": number | null,"margem_percentual": number | null,"resultado": number | null,"status": string,"taxas_recebimento": number | null,"tipo": string,"total_recebido": number | null,"trabalho_id": string,"valor_total": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "trabalhos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "caminho_pdf_recibo":
{ Args: { "p_ano": number,"p_numero": number }; Returns: string
                           },
"eh_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"eh_usuario":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"emitir_recibo":
{ Args: { "p_recebimento_id": string }; Returns: {
              "ano": number,
"arquivo_pdf": string | null,
"atualizado_em": string,
"criado_em": string,
"criado_por": string | null,
"data_emissao": string,
"id": string,
"motivo_cancelamento": string | null,
"numero": number,
"recebimento_id": string,
"status": string
            }
                          SetofOptions: {
        from: "*"
        to: "recibos"
        isOneToOne: true
        isSetofReturn: false
      } },
"hoje":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"salvar_trabalho":
{ Args: { "p_parcelas": Json,"p_trabalho": Json }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
