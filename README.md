# Sistema Douglas Fotos

Controle interno do estúdio Douglas Guimarães Fotografia: trabalhos, parcelas, recebimentos, recibos, notas fiscais (NFS-e) e despesas.
Regras e decisões: [`CLAUDE.md`](CLAUDE.md) e [`docs/ESPECIFICACAO_MVP.md`](docs/ESPECIFICACAO_MVP.md).

Stack: React + TypeScript + Vite + Tailwind, Supabase (Postgres, Auth, Storage) e deploy na Vercel.

## Rodar localmente

Requisitos: Node 20+ e Docker Desktop aberto.

```sh
npm install
npm run db:iniciar          # sobe o Supabase local e aplica as migrations
cp .env.example .env.local  # cole a ANON_KEY mostrada pelo comando acima
npm run dev                 # http://localhost:5173
```

O Supabase local usa as portas **553xx** (API em `http://127.0.0.1:55321`) para não colidir com outros projetos.

### Criar usuários locais

O cadastro público está desligado. Crie o usuário no Studio local (`npx supabase start` sem `-x studio`) ou pela API admin e libere o acesso com uma linha em `perfis`:

```sql
insert into public.perfis (id, nome, papel)
select id, 'Douglas', 'dono' from auth.users where email = 'email-do-douglas@exemplo.com';
```

### Testes

```sh
npm run db:testar   # regras do banco (pgTAP)
npm test            # front (Vitest)
```

`npm run db:testar` roda os testes direto no container do banco. A alternativa oficial, `npx supabase test db`, só funciona se o Docker Desktop tiver permissão para acessar a pasta do projeto (Ajustes do Sistema → Privacidade → Arquivos e Pastas).

## Colocar em produção

1. **Supabase:** crie o projeto na região `sa-east-1` (São Paulo).
2. Aplique as migrations: `npx supabase link --project-ref <ref>` e depois `npx supabase db push`.
3. No painel, em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**.
4. Em **Authentication → URL Configuration**, defina a *Site URL* com o domínio da Vercel e adicione `https://<domínio>/**` às *Redirect URLs*. É para lá que vão os links de convite e de recuperação de senha.
5. Convide os dois usuários em **Authentication → Users → Invite user**. Depois, no SQL Editor, crie a linha em `perfis` de cada um (veja o SQL acima; papel `admin` para o Theodoro e `dono` para o Douglas).
6. **Vercel:** importe o repositório e configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Project Settings → API do Supabase). O `vercel.json` já cuida do roteamento da SPA.

Quem é convidado recebe um e-mail com um link e cria a própria senha na tela "Criar senha".
