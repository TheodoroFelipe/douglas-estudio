import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import './index.css'
import { roteador } from './rotas'

// O painel soma tudo (recebimentos, notas, despesas, parcelas, status dos
// trabalhos): qualquer gravação, mesmo a que falhou no meio, o deixa velho.
const queryClient: QueryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['painel'] }),
  }),
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={roteador} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
