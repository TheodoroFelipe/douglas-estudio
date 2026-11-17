import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { linkDeSenhaNaUrl, supabase } from '../lib/supabase'
import { ContextoAuth, type EstadoAuth } from './contexto'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [sessao, setSessao] = useState<Session | null>(null)
  const [sessaoCarregada, setSessaoCarregada] = useState(false)
  const [precisaDefinirSenha, setPrecisaDefinirSenha] = useState(linkDeSenhaNaUrl)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setSessaoCarregada(true)
    })

    // Não chamar o Supabase de dentro deste callback (pode travar o client);
    // só atualizar o estado.
    const { data } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      setSessao(novaSessao)
      setSessaoCarregada(true)
      if (evento === 'PASSWORD_RECOVERY') setPrecisaDefinirSenha(true)
      if (evento === 'SIGNED_OUT') queryClient.clear()
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const usuarioId = sessao?.user.id
  const consultaPerfil = useQuery({
    queryKey: ['perfil', usuarioId],
    enabled: !!usuarioId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', usuarioId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const valor = useMemo<EstadoAuth>(() => {
    const perfil = consultaPerfil.data ?? null
    return {
      carregando: !sessaoCarregada || (!!usuarioId && consultaPerfil.isPending),
      sessao,
      perfil,
      ehAdmin: perfil?.papel === 'admin',
      precisaDefinirSenha,
      senhaDefinida: () => setPrecisaDefinirSenha(false),
      sair: async () => {
        await supabase.auth.signOut()
      },
    }
  }, [sessao, sessaoCarregada, usuarioId, consultaPerfil.data, consultaPerfil.isPending, precisaDefinirSenha])

  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>
}
