import { createClient } from '@supabase/supabase-js'
import type { Database } from './tipos-banco'

const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !chave) {
  throw new Error(
    'Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Copie .env.example para .env.local e preencha.',
  )
}

// Links de convite e de recuperação de senha chegam com "#...&type=invite|recovery".
// Lido antes de criar o client, que consome e limpa o hash da URL.
const tipo = new URLSearchParams(window.location.hash.slice(1)).get('type')
export const linkDeSenhaNaUrl = tipo === 'invite' || tipo === 'recovery'

// Só a anon key vai para o front; o acesso aos dados é controlado pelo RLS.
export const supabase = createClient<Database>(url, chave)
