# Especificação do MVP — Sistema Douglas Fotos

Versão 0.3 · 17/11/2026

## 1. Objetivo

Dar ao estúdio uma visão única de **quanto foi contratado, quanto entrou, quanto foi gasto e se a nota final foi emitida**, por trabalho e por mês, sem planilhas soltas.

Fora do escopo do MVP: emissão de NFS-e (continua no Emissor Nacional), integração bancária, cálculo de impostos do Simples, agenda de sessões.

## 2. Fluxo do estúdio

```
Contrato fechado → Trabalho + plano de parcelas
      │
      ├─ Sinal / parcelas recebidos → Recebimento → Recibo (PDF gerado pelo sistema)
      ├─ Gastos do trabalho → Despesas diretas
      │
Serviço concluído → NFS-e única com valor total (Emissor Nacional) → registrada aqui
```

## 3. Modelo de dados

### `perfis`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| nome | text | |
| papel | text | `admin` ou `dono` |

### `clientes`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| nome | text | obrigatório |
| tipo_pessoa | text | `PF` ou `PJ` (ex.: comissão de formatura com CNPJ) |
| cpf_cnpj | text | só dígitos, validado; único |
| telefone | text | |
| email | text | |
| endereco | text | necessário no recibo e na NFS-e |
| observacoes | text | |
| criado_em | timestamptz | default now() |

### `trabalhos`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| cliente_id | uuid FK → clientes | |
| tipo | text | `formatura`, `ensaio`, `casamento`, `evento`, `outro` |
| descricao | text | ex.: "Formatura Medicina UNILA 2026" |
| data_evento | date | |
| data_conclusao | date | preenchida ao concluir; dispara o alerta de nota |
| valor_total | numeric(12,2) | |
| numero_contrato | text | opcional, liga ao contrato .docx |
| status | text | `orcamento`, `em_andamento`, `concluido`, `cancelado` |
| criado_em | timestamptz | |

### `parcelas`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| trabalho_id | uuid FK → trabalhos | |
| numero | int | 0 = sinal, 1..N |
| valor | numeric(12,2) | |
| vencimento | date | |

Status da parcela é **calculado** (view), não gravado: `paga`, `parcial`, `em_aberto`, `vencida`.

### `recebimentos`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| trabalho_id | uuid FK → trabalhos | |
| parcela_id | uuid FK → parcelas | opcional |
| data_recebimento | date | |
| valor | numeric(12,2) | |
| forma_pagamento | text | `pix`, `dinheiro`, `cartao_credito`, `cartao_debito`, `boleto`, `transferencia` |
| taxa | numeric(12,2) | taxa da maquininha, opcional (entra como despesa do trabalho) |
| status | text | `confirmado`, `estornado` |
| observacoes | text | |
| criado_em | timestamptz | |

### `recibos`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| recebimento_id | uuid FK → recebimentos | único (1 recibo por recebimento) |
| numero | int | sequencial por ano (ex.: 2026/0001) |
| ano | int | |
| data_emissao | date | |
| arquivo_pdf | text | caminho no Storage |
| status | text | `emitido`, `cancelado` |

O PDF do recibo traz: **logo do estúdio** no cabeçalho, dados do estúdio, nome e CPF/CNPJ do cliente, valor em número e **por extenso**, referência ("sinal / parcela 2 de 8 — Formatura X"), forma de pagamento, data, local e linha de assinatura.

### `notas_fiscais`
Campos alinhados ao Emissor Nacional da NFS-e. **No máximo uma nota com status `emitida` por trabalho** (índice único parcial).

| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| trabalho_id | uuid FK → trabalhos | |
| numero | text | número da NFS-e |
| chave_acesso | text | 50 dígitos, único |
| data_emissao | date | |
| data_competencia | date | mês de referência para o Simples |
| valor_servico | numeric(12,2) | deve ser igual ao `valor_total` do trabalho (alerta se diferente) |
| aliquota_iss | numeric(5,2) | informativa (no Simples o ISS vai no DAS) |
| codigo_servico | text | padrão **13.03.01** (vem das configurações) |
| descricao_servico | text | padrão nas configurações (sugestão: "Serviços de fotografia"), editável por nota |
| status | text | `emitida`, `cancelada`, `substituida` |
| arquivo_pdf | text | caminho no Storage |
| arquivo_xml | text | caminho no Storage |
| criado_em | timestamptz | |

### `tipos_despesa`
Cadastrados pelo usuário (dono ou admin) na tela **Tipos de despesa**.

| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| nome | text | único; ex.: segundo fotógrafo, álbum, deslocamento |
| classificacao | text | `direta` (custo de um trabalho) ou `indireta` (custo do estúdio) |
| ativo | boolean | desativar em vez de apagar, se já tiver despesas |

Sugestão inicial (pode editar):

| Direta | Indireta |
|---|---|
| Segundo fotógrafo / assistente | Aluguel |
| Impressão e álbum | Energia e internet |
| Deslocamento e combustível | Equipamento e manutenção |
| Alimentação no evento | Software e assinaturas |
| Taxa de cartão | Marketing |
| Edição terceirizada | Imposto (DAS) e contador |

### `despesas`
| Coluna | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| tipo_despesa_id | uuid FK → tipos_despesa | |
| trabalho_id | uuid FK → trabalhos | **obrigatório se o tipo for direto; vazio se for indireto** (validado por trigger) |
| data | date | |
| valor | numeric(12,2) | |
| descricao | text | |
| fornecedor | text | opcional |
| comprovante | text | caminho no Storage, opcional |
| status | text | `ativa`, `cancelada` |
| motivo_cancelamento | text | obrigatório ao cancelar; despesa cancelada não muda mais |

Data não pode ser futura. Comprovante (PDF ou foto, até 10 MB) no bucket privado `comprovantes`, em `{id}/comprovante.{ext}`.

### Views
- **`vw_conciliacao_trabalho`**: por trabalho, `valor_total`, `total_recebido`, `saldo_a_receber`, `tem_nota`, `valor_nota`, `recebimentos_sem_recibo`, `parcelas_vencidas`.
- **`vw_resultado_trabalho`**: por trabalho, `total_recebido`, `despesas_diretas`, `resultado` (recebido − despesas diretas), `margem_%`.
- **`vw_consolidado_mensal`**: por mês, `recebido`, `faturado_em_nota`, `despesas_diretas`, `despesas_indiretas`, `resultado`.

## 4. Telas

| Tela | O que faz |
|---|---|
| Login | e-mail e senha |
| Painel do mês | recebido, a receber, vencido, despesas, resultado; lista de alertas; seletor de mês |
| Painel consolidado | gráfico mensal de receitas × despesas × resultado no ano; ranking dos trabalhos por resultado; despesas por categoria |
| Clientes | lista com busca; cadastro/edição |
| Trabalhos | lista com filtros (status, tipo, mês); detalhe com parcelas, recebimentos/recibos, despesas, nota fiscal e o resultado do trabalho; botão **Concluir trabalho** |
| Novo trabalho | dados + gerador de parcelas (sinal + N parcelas mensais), editável antes de salvar; a soma deve bater com o total |
| Recebimentos | lista por mês e forma de pagamento; registrar recebimento → oferece **Gerar recibo** na hora |
| Recibos | lista, baixar PDF de novo, cancelar |
| Notas fiscais | lista; cadastrar a NFS-e final do trabalho com PDF/XML (valor já preenchido com o total); cancelar |
| Despesas | lista por mês, tipo e classificação; lançar despesa escolhendo o tipo (se o tipo for direto, o campo Trabalho aparece e é obrigatório); comprovante opcional |
| Tipos de despesa | cadastrar, editar e desativar tipos, classificando cada um como direto ou indireto |
| Exportar | CSV de recebimentos, notas e despesas do mês, para o contador |
| Configurações (admin) | dados do estúdio e **upload do logo** (para o recibo), código padrão do serviço (13.03.01), descrição padrão, alíquota |

## 5. Alertas do painel

| Alerta | Quando aparece |
|---|---|
| Nota pendente | trabalho `concluido` sem nota `emitida` |
| Nota divergente | valor da nota ≠ valor total do trabalho |
| Recibo pendente | recebimento confirmado sem recibo |
| Parcela vencida | vencimento passou e a parcela não foi paga |
| Trabalho no prejuízo | despesas diretas > recebido em trabalho concluído |

## 6. Critérios de aceite do MVP

- [ ] Só os dois usuários convidados conseguem entrar
- [x] Cadastrar uma formatura de R$ 3.000 com sinal de R$ 600 + 8 parcelas de R$ 300, e a soma ser validada
- [x] Registrar o sinal e gerar o recibo 2026/0001 em PDF com o valor por extenso
- [x] Ver a parcela mudar para `paga` após o recebimento
- [x] Concluir o trabalho e ver o alerta "Nota pendente"
- [x] Cadastrar a NFS-e de R$ 3.000 com PDF; o alerta some
- [x] Impedir uma segunda nota ativa no mesmo trabalho
- [ ] Cadastrar um tipo de despesa novo e classificá-lo como direto ou indireto
- [ ] Não conseguir salvar despesa de tipo direto sem trabalho
- [ ] Lançar despesas diretas e ver o resultado do trabalho
- [x] Recibo sai com o logo do estúdio
- [x] Painel consolidado mostra receitas, despesas e resultado por mês
- [ ] CSV do mês abre certo no Excel (separador `;`, decimal `,`, UTF-8 com BOM)

## 7. Decisões em aberto

1. Histórico de 2026: existe planilha ou caderno com os trabalhos e pagamentos deste ano? Se sim, importar; se não, começar do zero.
2. Texto padrão da descrição do serviço na nota (o código 13.03.01 já está definido).

Decididas: código de serviço **13.03.01**; recibo com **logo do estúdio**; tipos de despesa cadastráveis pelo usuário, classificados como **direto/indireto**.

## 8. Primeiro prompt para o Claude Code

> Leia o CLAUDE.md e o docs/ESPECIFICACAO_MVP.md. Entre em modo de planejamento e proponha: (1) a migration SQL inicial com todas as tabelas, índices (incluindo o índice único parcial de nota ativa por trabalho e a numeração sequencial de recibos), as views e as políticas RLS; (2) a estrutura de pastas do projeto React; (3) a biblioteca para gerar o PDF do recibo. Não escreva código ainda; liste as dúvidas que encontrar.
