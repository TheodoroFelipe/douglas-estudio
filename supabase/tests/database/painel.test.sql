-- Fase 5: painel por período (pgTAP).
-- Datas fixas em 2025, para os limites de mês ficarem claros.
-- Tudo roda numa transação desfeita no final.

begin;
select no_plan();

set constraints all immediate;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000d', 'dono@teste.local'),
  ('00000000-0000-0000-0000-00000000000e', 'estranho@teste.local');
insert into public.perfis (id, nome, papel) values
  ('00000000-0000-0000-0000-00000000000d', 'Douglas', 'dono');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);

insert into public.clientes (id, nome, tipo_pessoa) values
  ('00000000-0000-0000-0000-0000000000c1', 'Ana Souza', 'PF');

-- Trabalho A: 3.000 em 3 parcelas (jan, último dia de fev, 1º de mar).
-- Trabalho B: cancelado, com parcela em janeiro (não entra no previsto).
set constraints all deferred;
insert into public.trabalhos (id, cliente_id, tipo, descricao, valor_total) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'formatura', 'Trabalho A', 3000.00),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'ensaio', 'Trabalho B', 500.00);
insert into public.parcelas (id, trabalho_id, numero, valor, vencimento) values
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a1', 1, 1000.00, '2025-01-10'),
  ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000a1', 2, 1000.00, '2025-02-28'),
  ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a1', 3, 1000.00, '2025-03-01'),
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000000b1', 1, 500.00, '2025-01-15');
set constraints all immediate;
update public.trabalhos set status = 'cancelado' where id = '00000000-0000-0000-0000-0000000000b1';

-- Recebimentos: 1.000 no último dia de janeiro; 300 no cartão (taxa 9) em
-- 1º de fevereiro; 200 em janeiro estornado.
insert into public.recebimentos (trabalho_id, parcela_id, data_recebimento, valor, forma_pagamento, taxa) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a5', '2025-01-31', 1000.00, 'pix', 0),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a6', '2025-02-01', 300.00, 'cartao_credito', 9.00);
insert into public.recebimentos (id, trabalho_id, data_recebimento, valor, forma_pagamento) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', '2025-01-10', 200.00, 'dinheiro');
update public.recebimentos set status = 'estornado' where id = '00000000-0000-0000-0000-0000000000e1';

-- Notas: uma cancelada (competência 20/03) e a emitida (15/03), ambas de 3.000.
update public.trabalhos set status = 'concluido' where id = '00000000-0000-0000-0000-0000000000a1';
insert into public.notas_fiscais (id, trabalho_id, numero, chave_acesso, data_emissao, data_competencia, valor_servico) values
  ('00000000-0000-0000-0000-0000000000f8', '00000000-0000-0000-0000-0000000000a1', '48',
   '41083042211444777000161000000000004826111234567891', '2025-03-20', '2025-03-20', 3000.00);
update public.notas_fiscais set status = 'cancelada', motivo_cancelamento = 'Teste'
 where id = '00000000-0000-0000-0000-0000000000f8';
insert into public.notas_fiscais (trabalho_id, numero, chave_acesso, data_emissao, data_competencia, valor_servico) values
  ('00000000-0000-0000-0000-0000000000a1', '49',
   '41083042211444777000161000000000004926111234567895', '2025-03-15', '2025-03-15', 3000.00);

-- Despesas em fevereiro: direta 150 (trabalho A), indireta 400, e uma cancelada.
insert into public.tipos_despesa (id, nome, classificacao) values
  ('00000000-0000-0000-0000-0000000000d1', 'Álbum teste', 'direta'),
  ('00000000-0000-0000-0000-0000000000d2', 'Aluguel teste', 'indireta');
insert into public.despesas (tipo_despesa_id, trabalho_id, data, valor) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1', '2025-02-10', 150.00);
insert into public.despesas (tipo_despesa_id, data, valor) values
  ('00000000-0000-0000-0000-0000000000d2', '2025-02-20', 400.00);
insert into public.despesas (id, tipo_despesa_id, data, valor) values
  ('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000d2', '2025-02-21', 999.00);
update public.despesas set status = 'cancelada', motivo_cancelamento = 'Teste' where id = '00000000-0000-0000-0000-0000000000d9';

-- -----------------------------------------------------------------------------
-- Uma linha por mês
-- -----------------------------------------------------------------------------
select results_eq(
  $$ select mes, recebido, taxas, faturado, despesas_diretas, despesas_indiretas, resultado, previsto, a_receber
       from public.painel_periodo('2025-01-01', '2025-04-30') $$,
  $$ values
       ('2025-01-01'::date, 1000.00::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 1000.00::numeric, 1000.00::numeric, 0.00::numeric),
       ('2025-02-01', 300.00, 9.00, 0, 159.00, 400.00, -259.00, 1000.00, 700.00),
       ('2025-03-01', 0, 0, 3000.00, 0, 0, 0, 1000.00, 1000.00),
       ('2025-04-01', 0, 0, 0, 0, 0, 0, 0, 0) $$,
  'meses com recebido, taxas, faturado, despesas, resultado, previsto e a receber; abril vazio aparece com zero');

select is(
  (select count(*)::int from public.painel_periodo('2025-02-14', '2025-02-14')),
  1, 'um dia qualquer vale o mês inteiro');

select is(
  (select recebido from public.painel_periodo('2025-02-14', '2025-02-14')),
  300.00, 'fevereiro inteiro, incluindo o dia 1º');

select is(
  (select count(*)::int from public.painel_periodo('2024-12-01', '2025-12-31')),
  13, 'período de vários meses, atravessando o ano');

select is(
  public.total_vencido(),
  1700.00, 'vencido: saldo das parcelas que já venceram (700 + 1.000), sem o trabalho cancelado');

select throws_ok(
  $$ select * from public.painel_periodo('2025-03-01', '2025-01-01') $$,
  '22023', 'Período inválido: o fim vem antes do início.',
  'fim antes do início é recusado');

select throws_ok(
  $$ select * from public.painel_periodo('2010-01-01', '2025-01-01') $$,
  '22023', 'Período longo demais (máximo de 10 anos).',
  'período longo demais é recusado');

-- Sem perfil: o RLS esconde tudo, então os meses vêm zerados.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}', true);
select is(
  (select sum(recebido) + sum(faturado) + sum(previsto) from public.painel_periodo('2025-01-01', '2025-04-30')),
  0::numeric, 'sem perfil: o painel não mostra dados');

reset role;

select * from finish();
rollback;
