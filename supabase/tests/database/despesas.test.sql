-- Despesas e tipos de despesa (pgTAP).
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

set constraints all deferred;
insert into public.trabalhos (id, cliente_id, tipo, descricao, valor_total) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'ensaio', 'Ensaio Ana', 1000.00);
insert into public.parcelas (trabalho_id, numero, valor, vencimento) values
  ('00000000-0000-0000-0000-0000000000f1', 0, 1000.00, public.hoje());
set constraints all immediate;

insert into public.recebimentos (trabalho_id, valor, forma_pagamento, taxa)
values ('00000000-0000-0000-0000-0000000000f1', 1000.00, 'cartao_credito', 30.00);

-- -----------------------------------------------------------------------------
-- Tipos de despesa
-- -----------------------------------------------------------------------------
insert into public.tipos_despesa (id, nome, classificacao) values
  ('00000000-0000-0000-0000-0000000000a1', '  Drone   aéreo ', 'direta'),
  ('00000000-0000-0000-0000-0000000000a2', 'Contabilidade', 'indireta');

select is(
  (select nome from public.tipos_despesa where id = '00000000-0000-0000-0000-0000000000a1'),
  'Drone aéreo', 'nome do tipo sem espaços sobrando');

select throws_ok(
  $$ insert into public.tipos_despesa (nome, classificacao) values ('DRONE AEREO', 'direta') $$,
  '23505', null,
  'nome repetido (maiúsculas e acento) é recusado');

select lives_ok(
  $$ update public.tipos_despesa set classificacao = 'indireta' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'tipo sem despesas muda de classificação');
update public.tipos_despesa set classificacao = 'direta' where id = '00000000-0000-0000-0000-0000000000a1';

-- -----------------------------------------------------------------------------
-- Lançamento
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ insert into public.despesas (id, tipo_despesa_id, trabalho_id, valor, descricao, fornecedor)
     values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1',
             '00000000-0000-0000-0000-0000000000f1', 200.00, '  Imagens aéreas ', '   ') $$,
  'despesa direta com trabalho');

select is(
  (select coalesce(descricao, '∅') || '|' || coalesce(fornecedor, '∅') from public.despesas
    where id = '00000000-0000-0000-0000-0000000000d1'),
  'Imagens aéreas|∅', 'descrição sem espaços nas pontas; fornecedor em branco vira vazio');

select lives_ok(
  $$ insert into public.despesas (id, tipo_despesa_id, valor)
     values ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000a2', 300.00) $$,
  'despesa indireta sem trabalho');

select throws_ok(
  $$ insert into public.despesas (tipo_despesa_id, trabalho_id, data, valor)
     values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1',
             public.hoje() + 1, 50.00) $$,
  '23514', 'A data da despesa não pode ser futura.',
  'data futura é recusada');

select throws_ok(
  $$ insert into public.despesas (tipo_despesa_id, valor, status, motivo_cancelamento)
     values ('00000000-0000-0000-0000-0000000000a2', 50.00, 'cancelada', 'teste') $$,
  '23514', 'Despesa nova entra como ativa.',
  'despesa nova não entra cancelada');

select throws_ok(
  $$ insert into public.despesas (tipo_despesa_id, valor, motivo_cancelamento)
     values ('00000000-0000-0000-0000-0000000000a2', 50.00, 'sem motivo') $$,
  '23514', 'Só despesa cancelada tem motivo de cancelamento.',
  'motivo só em despesa cancelada');

select throws_ok(
  $$ update public.despesas set valor = 0 where id = '00000000-0000-0000-0000-0000000000d1' $$,
  '23514', null,
  'valor precisa ser positivo');

select throws_ok(
  $$ update public.tipos_despesa set classificacao = 'indireta' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23514', null,
  'tipo com despesas não muda de classificação');

select throws_ok(
  $$ delete from public.tipos_despesa where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23503', null,
  'tipo com despesas não pode ser apagado');

-- Tipo desativado: não entra em despesa nova, mas as antigas seguem editáveis.
update public.tipos_despesa set ativo = false where id = '00000000-0000-0000-0000-0000000000a2';
select throws_ok(
  $$ insert into public.despesas (tipo_despesa_id, valor) values ('00000000-0000-0000-0000-0000000000a2', 10.00) $$,
  '23514', null,
  'tipo desativado não entra em despesa nova');
select lives_ok(
  $$ update public.despesas set valor = 350.00 where id = '00000000-0000-0000-0000-0000000000d2' $$,
  'despesa antiga de tipo desativado continua editável');
update public.tipos_despesa set ativo = true where id = '00000000-0000-0000-0000-0000000000a2';

-- -----------------------------------------------------------------------------
-- Comprovante
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('comprovantes', '00000000-0000-0000-0000-0000000000d1/comprovante.pdf') $$,
  'storage: aceita o comprovante da despesa ativa no caminho dela');

select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('comprovantes', 'qualquer/coisa.pdf') $$,
  '42501', null,
  'storage: recusa arquivo fora do caminho de uma despesa');

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('comprovantes', '00000000-0000-0000-0000-0000000000d1/outro.pdf') $$,
  '42501', null,
  'storage: recusa outro nome de arquivo na pasta da despesa');

select lives_ok(
  $$ update public.despesas set comprovante = '00000000-0000-0000-0000-0000000000d1/comprovante.pdf'
      where id = '00000000-0000-0000-0000-0000000000d1' $$,
  'despesa recebe o caminho do comprovante');

select throws_ok(
  $$ update public.despesas set comprovante = '00000000-0000-0000-0000-0000000000d2/comprovante.pdf'
      where id = '00000000-0000-0000-0000-0000000000d1' $$,
  '23514', null,
  'comprovante no caminho de outra despesa é recusado');

-- -----------------------------------------------------------------------------
-- Resultado do trabalho
-- -----------------------------------------------------------------------------
select results_eq(
  $$ select total_recebido, despesas_diretas, resultado, margem_percentual
       from public.vw_resultado_trabalho where trabalho_id = '00000000-0000-0000-0000-0000000000f1' $$,
  $$ values (1000.00::numeric, 230.00::numeric, 770.00::numeric, 77.00::numeric) $$,
  'resultado = recebido − (despesas diretas + taxa do cartão); despesa indireta não entra');

-- -----------------------------------------------------------------------------
-- Cancelamento
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ update public.despesas set status = 'cancelada' where id = '00000000-0000-0000-0000-0000000000d1' $$,
  '23514', 'Informe o motivo do cancelamento da despesa.',
  'cancelar exige motivo');

select lives_ok(
  $$ update public.despesas set status = 'cancelada', motivo_cancelamento = 'Lançada em dobro'
      where id = '00000000-0000-0000-0000-0000000000d1' $$,
  'cancelar com motivo');

select results_eq(
  $$ select despesas_diretas, resultado
       from public.vw_resultado_trabalho where trabalho_id = '00000000-0000-0000-0000-0000000000f1' $$,
  $$ values (30.00::numeric, 970.00::numeric) $$,
  'despesa cancelada sai do resultado (fica só a taxa)');

select throws_ok(
  $$ update public.despesas set status = 'ativa', motivo_cancelamento = null
      where id = '00000000-0000-0000-0000-0000000000d1' $$,
  '23514', 'Despesa cancelada não pode ser alterada. Lance uma despesa nova.',
  'cancelada não volta a ficar ativa');

select throws_ok(
  $$ update public.despesas set valor = 10.00 where id = '00000000-0000-0000-0000-0000000000d1' $$,
  '23514', 'Despesa cancelada não pode ser alterada. Lance uma despesa nova.',
  'cancelada não é editada');

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('comprovantes', '00000000-0000-0000-0000-0000000000d1/comprovante.png') $$,
  '42501', null,
  'storage: despesa cancelada não recebe comprovante');

-- Sem policy de delete: o DELETE não dá erro, só não apaga nada.
delete from public.despesas where id = '00000000-0000-0000-0000-0000000000d2';
select ok(
  exists (select 1 from public.despesas where id = '00000000-0000-0000-0000-0000000000d2'),
  'despesa não se apaga (sem policy de delete)');

-- -----------------------------------------------------------------------------
-- Permissões
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}', true);

select is((select count(*)::int from public.despesas), 0, 'sem perfil: não vê despesas');
select throws_ok(
  $$ insert into public.despesas (tipo_despesa_id, valor) values ('00000000-0000-0000-0000-0000000000a2', 10.00) $$,
  '42501', null,
  'sem perfil: não lança despesa');

reset role;

select * from finish();
rollback;
