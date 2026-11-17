# CLAUDE.md — Sistema Douglas Fotos

## Contexto

Sistema de controle interno do estúdio **Douglas Guimarães Fotografia** (Foz do Iguaçu/PR), com foco em formaturas e ensaios.
Objetivo: registrar as **notas fiscais de serviço emitidas** e as **receitas (recebimentos)**, e cruzar uma coisa com a outra.

- O sistema **não emite nota fiscal**. A emissão continua no **Emissor Nacional da NFS-e (gov.br/nfse)**. Aqui só registramos a nota já emitida (dados + PDF/XML).
- Regime tributário do estúdio: **Simples Nacional**.
- Trabalhos podem ser **parcelados** (sinal + parcelas). Por isso, recebimento e nota fiscal são entidades separadas e se ligam pelo trabalho.

## Usuários e permissões

Apenas dois usuários, sem cadastro público:

| Papel | Quem | Pode |
|---|---|---|
| `admin` | Theodoro (desenvolvedor) | Tudo, incluindo gerenciar usuários e configurações |
| `dono` | Douglas | Tudo do dia a dia: clientes, trabalhos, notas, recebimentos, relatórios |

- Login por e-mail/senha (Supabase Auth). **Desativar signup público**; usuários são convidados pelo painel do Supabase.
- Toda tabela tem **RLS ativa**. Política básica: só usuários com registro em `perfis` acessam os dados.

## Stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Storage para PDF/XML das notas)
- **Deploy:** Vercel
- **Validação:** Zod nos formulários
- **Datas e dinheiro:** valores em `numeric(12,2)` no banco e em centavos/inteiros ou Decimal no front — **nunca float para dinheiro**. Exibir em `pt-BR` (R$ 1.234,56; dd/mm/aaaa). Fuso `America/Sao_Paulo`.

## Regras de negócio

1. Um **cliente** pode ter vários **trabalhos**.
2. Um **trabalho** tem valor total combinado e um **plano de parcelas** (sinal + N parcelas com vencimento). A soma das parcelas deve ser igual ao valor total.
3. Um **recebimento** é dinheiro que entrou de fato. Sempre pertence a um trabalho e, opcionalmente, quita uma parcela.
4. **Fluxo fiscal do estúdio:**
   - Cada adiantamento (sinal ou parcela antes da entrega) gera um **recibo** numerado em sequência, que o sistema emite em PDF.
   - Ao **concluir o serviço**, o estúdio emite **uma única NFS-e com o valor total do trabalho** no Emissor Nacional e registra essa nota aqui.
   - Portanto, cada trabalho tem no máximo **uma nota ativa** (as canceladas ou substituídas ficam no histórico).
5. **Conciliação por trabalho:** valor contratado × total recebido × nota emitida. Alertas:
   - **trabalho concluído sem nota fiscal** (o alerta principal)
   - valor da nota diferente do valor total do trabalho
   - recebimento sem recibo emitido
   - parcela vencida e não paga
   - Recebido sem nota **não é alerta** enquanto o trabalho estiver em andamento; é o fluxo normal.
6. Nota cancelada não entra em nenhum total, mas continua visível no histórico.
7. Não apagar registros financeiros: usar status (`cancelada`, `estornado`) em vez de DELETE.
8. **Despesas:** cada despesa tem um **tipo de despesa**. Os tipos são cadastrados pelo próprio usuário (dono ou admin), e cada um é classificado como **direto** (custo de um trabalho específico: segundo fotógrafo, álbum, deslocamento) ou **indireto** (custo do estúdio: aluguel, equipamento, software, DAS). Despesa de tipo direto exige um trabalho; despesa de tipo indireto não tem trabalho. O resultado de cada trabalho é recebido − despesas diretas.
9. **Dados fiscais padrão:** código de tributação nacional do serviço **13.03.01** (fotografia), já preenchido em toda nota nova e editável em Configurações.
10. **Recibo:** leva o **logo do estúdio** (enviado em Configurações e guardado no Storage).

## Proteção de dados (LGPD)

- Guardar só o necessário do cliente: nome, CPF/CNPJ, telefone, e-mail. Nada além disso sem motivo.
- PDFs/XMLs das notas em bucket **privado** do Storage, acessados por URL assinada.
- Nunca commitar chaves. `.env.local` no `.gitignore`; só a `anon key` vai para o front.

## Convenções de código

- Código e nomes de tabelas/colunas em **português sem acento** e `snake_case` no banco (`notas_fiscais`, `data_emissao`). Componentes React em `PascalCase`.
- Interface 100% em português do Brasil.
- Migrations SQL versionadas em `supabase/migrations/`. Nada de alterar o banco "na mão" sem migration.
- Um commit por fase/funcionalidade, mensagem em português.
- Antes de implementar algo grande, apresentar o plano e esperar aprovação.

## Fases

1. Projeto base, Supabase, login e tabela `perfis`
2. Clientes e trabalhos (com plano de parcelas)
3. Recebimentos (com baixa de parcela) e emissão de recibo em PDF
4. Notas fiscais (cadastro da NFS-e final + upload de PDF/XML)
5. Painel mensal e alertas de conciliação
6. Despesas (diretas e indiretas, com tipos cadastráveis) e resultado por trabalho
7. Painel consolidado (receitas × despesas × resultado) e exportação CSV para o contador

A especificação detalhada está em `docs/ESPECIFICACAO_MVP.md`.
