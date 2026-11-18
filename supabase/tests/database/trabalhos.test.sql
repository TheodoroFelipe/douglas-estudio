-- Fase 2: clientes, trabalhos e parcelas (pgTAP).
-- Tudo roda numa transação desfeita no final.

begin;
select no_plan();

-- Verificações deferidas rodam a cada comando (a transação nunca chega ao commit).
set constraints all immediate;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000d', 'dono@teste.local');
insert into public.perfis (id, nome, papel) values
  ('00000000-0000-0000-0000-00000000000d', 'Douglas', 'dono');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);

-- -----------------------------------------------------------------------------
-- Clientes
-- -----------------------------------------------------------------------------
insert into public.clientes (id, nome, tipo_pessoa, cpf_cnpj) values
  ('00000000-0000-0000-0000-0000000000c1', 'Ana Souza', 'PF', '52998224725'),
  ('00000000-0000-0000-0000-0000000000c2', 'Bruno Lima', 'PF', null);

select throws_ok(
  $$ insert into public.clientes (nome, tipo_pessoa, cpf_cnpj) values ('Outra Ana', 'PF', '52998224725') $$,
  '23505', null,
  'CPF duplicado é rejeitado');

select throws_ok(
  $$ insert into public.clientes (nome, tipo_pessoa, cpf_cnpj) values ('PJ curta', 'PJ', '52998224725') $$,
  '23514', null,
  'PJ exige CNPJ com 14 dígitos');

select lives_ok(
  $$ delete from public.clientes where id = '00000000-0000-0000-0000-0000000000c2' $$,
  'cliente sem trabalho pode ser apagado');

-- -----------------------------------------------------------------------------
-- Plano de parcelas obrigatório
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ select public.salvar_trabalho(
       jsonb_build_object('cliente_id', '00000000-0000-0000-0000-0000000000c1',
                          'tipo', 'ensaio', 'descricao', 'Sem plano', 'valor_total', '500.00'),
       '[]'::jsonb) $$,
  '23514', 'O trabalho precisa ter pelo menos uma parcela.',
  'trabalho sem parcela é rejeitado');

-- Ensaio à vista: uma parcela só.
select lives_ok(
  $$ select public.salvar_trabalho(
       jsonb_build_object('cliente_id', '00000000-0000-0000-0000-0000000000c1',
                          'tipo', 'ensaio', 'descricao', 'Ensaio à vista', 'valor_total', '500.00'),
       jsonb_build_array(jsonb_build_object('numero', 0, 'valor', '500.00', 'vencimento', public.hoje()))) $$,
  'pagamento à vista = plano com uma parcela');

select throws_ok(
  $$ delete from public.parcelas p using public.trabalhos t
      where t.id = p.trabalho_id and t.descricao = 'Ensaio à vista' $$,
  '23514', 'O trabalho precisa ter pelo menos uma parcela.',
  'apagar a única parcela do trabalho é rejeitado');

select throws_ok(
  $$ delete from public.clientes where id = '00000000-0000-0000-0000-0000000000c1' $$,
  '23503', null,
  'cliente com trabalho não pode ser apagado');

-- -----------------------------------------------------------------------------
-- Parcela com dinheiro recebido
-- -----------------------------------------------------------------------------
select public.salvar_trabalho(
  jsonb_build_object('cliente_id', '00000000-0000-0000-0000-0000000000c1',
                     'tipo', 'formatura', 'descricao', 'Formatura Ana', 'valor_total', '1000.00'),
  jsonb_build_array(
    jsonb_build_object('numero', 0, 'valor', '400.00', 'vencimento', public.hoje()),
    jsonb_build_object('numero', 1, 'valor', '600.00', 'vencimento', public.hoje() + 30)));

insert into public.recebimentos (trabalho_id, parcela_id, valor, forma_pagamento)
select p.trabalho_id, p.id, 300.00, 'pix'
  from public.parcelas p join public.trabalhos t on t.id = p.trabalho_id
 where t.descricao = 'Formatura Ana' and p.numero = 0;

select throws_ok(
  $$ update public.parcelas p set valor = 250.00
       from public.trabalhos t
      where t.id = p.trabalho_id and t.descricao = 'Formatura Ana' and p.numero = 0 $$,
  '23514', 'A parcela 0 já tem 300.00 recebido; o valor não pode ficar menor que isso.',
  'parcela não fica com valor menor que o já pago');

select throws_ok(
  $$ delete from public.parcelas p using public.trabalhos t
      where t.id = p.trabalho_id and t.descricao = 'Formatura Ana' and p.numero = 0 $$,
  '23503', null,
  'parcela com recebimento não pode ser apagada');

-- Redistribuir mantendo o que já foi pago é permitido (soma checada no fim).
set constraints all deferred;
update public.parcelas p set valor = case p.numero when 0 then 300.00 else 700.00 end
  from public.trabalhos t
 where t.id = p.trabalho_id and t.descricao = 'Formatura Ana';
select lives_ok('set constraints all immediate', 'parcela pode baixar até o valor já pago');

-- -----------------------------------------------------------------------------
-- Status do trabalho x nota emitida
-- -----------------------------------------------------------------------------
update public.trabalhos set status = 'concluido' where descricao = 'Formatura Ana';

select lives_ok(
  $$ update public.trabalhos set status = 'em_andamento' where descricao = 'Formatura Ana' $$,
  'trabalho concluído sem nota pode ser reaberto');
select is(
  (select data_conclusao from public.trabalhos where descricao = 'Formatura Ana'),
  null, 'reabrir limpa a data de conclusão');

update public.trabalhos set status = 'concluido' where descricao = 'Formatura Ana';

insert into public.notas_fiscais (id, trabalho_id, numero, chave_acesso, data_emissao, data_competencia, valor_servico)
select '00000000-0000-0000-0000-0000000000f1', id, '7', repeat('7', 50), public.hoje(), public.hoje(), 1000.00
  from public.trabalhos where descricao = 'Formatura Ana';

select throws_ok(
  $$ update public.trabalhos set status = 'em_andamento' where descricao = 'Formatura Ana' $$,
  '23514', 'Este trabalho tem nota fiscal emitida. Cancele a nota antes de reabrir o trabalho.',
  'com nota emitida o trabalho não é reaberto');

select throws_ok(
  $$ update public.trabalhos set status = 'cancelado' where descricao = 'Formatura Ana' $$,
  '23514', 'Este trabalho tem nota fiscal emitida. Cancele a nota antes de cancelar o trabalho.',
  'com nota emitida o trabalho não é cancelado');

select lives_ok(
  $$ update public.trabalhos set descricao = 'Formatura Ana Souza' where descricao = 'Formatura Ana' $$,
  'com nota emitida os outros dados do trabalho continuam editáveis');

update public.notas_fiscais set status = 'cancelada', motivo_cancelamento = 'Erro no tomador'
 where id = '00000000-0000-0000-0000-0000000000f1';

select lives_ok(
  $$ update public.trabalhos set status = 'em_andamento' where descricao = 'Formatura Ana Souza' $$,
  'com a nota cancelada o trabalho pode ser reaberto');

-- Cancelar e reativar.
select lives_ok(
  $$ update public.trabalhos set status = 'cancelado' where descricao = 'Ensaio à vista' $$,
  'trabalho sem nota pode ser cancelado');
select lives_ok(
  $$ update public.trabalhos set status = 'orcamento' where descricao = 'Ensaio à vista' $$,
  'trabalho cancelado pode ser reativado');

reset role;

select * from finish();
rollback;
