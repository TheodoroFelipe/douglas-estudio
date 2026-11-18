-- Fase 3: recebimentos e recibos (pgTAP).
-- Tudo roda numa transação desfeita no final.

begin;
select no_plan();

set constraints all immediate;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000d', 'dono@teste.local');
insert into public.perfis (id, nome, papel) values
  ('00000000-0000-0000-0000-00000000000d', 'Douglas', 'dono');

-- Começa com o estúdio sem dados, para testar a exigência na emissão.
update public.configuracoes
   set razao_social = null, cnpj = null, endereco = null, responsavel_assinatura = null, logo_path = null;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);

insert into public.clientes (id, nome, tipo_pessoa, cpf_cnpj) values
  ('00000000-0000-0000-0000-0000000000c1', 'Ana Souza', 'PF', '52998224725');

-- Trabalho de 1.000 = sinal 400 + parcela 600 (ids fixos; soma checada no fim).
set constraints all deferred;
insert into public.trabalhos (id, cliente_id, tipo, descricao, valor_total) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'ensaio', 'Ensaio Ana', 1000.00);
insert into public.parcelas (id, trabalho_id, numero, valor, vencimento) values
  ('00000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-0000000000f1', 0, 400.00, public.hoje()),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 1, 600.00, public.hoje() + 30);
set constraints all immediate;

-- -----------------------------------------------------------------------------
-- Limite por parcela
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.recebimentos (trabalho_id, parcela_id, valor, forma_pagamento)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a0', 400.01, 'pix') $$,
  '23514', 'O saldo desta parcela é 400.00; o recebimento não pode passar disso.',
  'recebimento maior que o saldo da parcela é rejeitado');

insert into public.recebimentos (id, trabalho_id, parcela_id, valor, forma_pagamento)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1',
        '00000000-0000-0000-0000-0000000000a0', 150.00, 'dinheiro');

select is(
  (select status from public.vw_parcelas_status where id = '00000000-0000-0000-0000-0000000000a0'),
  'parcial', 'pagamento parcial deixa a parcela parcial');

select throws_ok(
  $$ insert into public.recebimentos (trabalho_id, parcela_id, valor, forma_pagamento)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a0', 300.00, 'pix') $$,
  '23514', 'O saldo desta parcela é 250.00; o recebimento não pode passar disso.',
  'segundo pagamento não passa do saldo que sobrou');

select lives_ok(
  $$ insert into public.recebimentos (id, trabalho_id, parcela_id, valor, forma_pagamento)
     values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000f1',
             '00000000-0000-0000-0000-0000000000a0', 250.00, 'pix') $$,
  'pagamento exato do saldo é aceito');

select is(
  (select status from public.vw_parcelas_status where id = '00000000-0000-0000-0000-0000000000a0'),
  'paga', 'parcela quitada fica paga');

select throws_ok(
  $$ insert into public.recebimentos (trabalho_id, parcela_id, valor, forma_pagamento)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a0', 1.00, 'pix') $$,
  '23514', 'Esta parcela já está paga.',
  'parcela paga não aceita mais recebimento');

select throws_ok(
  $$ update public.recebimentos set valor = 260.00 where id = '00000000-0000-0000-0000-0000000000b2' $$,
  '23514', 'O saldo desta parcela é 250.00; o recebimento não pode passar disso.',
  'corrigir o valor também respeita o saldo');

-- Estorno libera o saldo.
update public.recebimentos set status = 'estornado' where id = '00000000-0000-0000-0000-0000000000b1';

select lives_ok(
  $$ insert into public.recebimentos (id, trabalho_id, parcela_id, valor, forma_pagamento)
     values ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000f1',
             '00000000-0000-0000-0000-0000000000a0', 150.00, 'pix') $$,
  'depois do estorno, o valor pode ser lançado de novo');

-- -----------------------------------------------------------------------------
-- Limite do trabalho (recebimento sem parcela)
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.recebimentos (trabalho_id, valor, forma_pagamento)
     values ('00000000-0000-0000-0000-0000000000f1', 600.01, 'pix') $$,
  '23514', 'Faltam 600.00 para fechar o valor do trabalho. Se o cliente pagou a mais, aumente antes o valor do trabalho.',
  'recebimento avulso não passa do valor contratado');

insert into public.recebimentos (id, trabalho_id, valor, forma_pagamento)
values ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000f1', 600.00, 'transferencia');

select throws_ok(
  $$ insert into public.recebimentos (trabalho_id, parcela_id, valor, forma_pagamento)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 10.00, 'pix') $$,
  '23514', 'Este trabalho já foi todo recebido. Se o cliente pagou a mais, aumente antes o valor do trabalho.',
  'trabalho todo recebido não aceita mais, nem numa parcela em aberto');

-- O valor total não fica abaixo do recebido (aqui, 1.000).
select throws_ok(
  $$ select public.salvar_trabalho(
       jsonb_build_object('id', '00000000-0000-0000-0000-0000000000f1',
                          'cliente_id', '00000000-0000-0000-0000-0000000000c1',
                          'tipo', 'ensaio', 'descricao', 'Ensaio Ana', 'valor_total', '900.00'),
       jsonb_build_array(
         jsonb_build_object('id', '00000000-0000-0000-0000-0000000000a0', 'numero', 0, 'valor', '400.00', 'vencimento', public.hoje()),
         jsonb_build_object('id', '00000000-0000-0000-0000-0000000000a1', 'numero', 1, 'valor', '500.00', 'vencimento', public.hoje() + 30))) $$,
  '23514', 'Este trabalho já tem 1000.00 recebido; o valor total não pode ficar menor que isso.',
  'valor total não fica menor que o já recebido');

-- -----------------------------------------------------------------------------
-- Emissão: dados obrigatórios
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ select public.emitir_recibo('00000000-0000-0000-0000-0000000000b2') $$,
  '23514', 'Cadastre o endereço do cliente antes de emitir o recibo.',
  'sem endereço do cliente não emite');

update public.clientes set endereco = 'Rua das Cataratas, 10, Foz do Iguaçu/PR'
 where id = '00000000-0000-0000-0000-0000000000c1';

select throws_ok(
  $$ select public.emitir_recibo('00000000-0000-0000-0000-0000000000b2') $$,
  '23514', 'Faltam dados do estúdio em Configurações: razão social, CNPJ, endereço, responsável pela assinatura, logo.',
  'sem dados do estúdio não emite');

select is(
  (select count(*)::int from public.sequencia_recibos),
  0, 'emissão recusada não consome número');

reset role;
update public.configuracoes
   set razao_social = 'Douglas Guimarães Fotografia LTDA', cnpj = '11444777000161',
       endereco = 'Rua Teste, 100', responsavel_assinatura = 'Douglas Guimarães', logo_path = 'logo';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);

select is(
  (select public.caminho_pdf_recibo(ano, numero) from public.emitir_recibo('00000000-0000-0000-0000-0000000000b2')),
  extract(year from public.hoje())::int || '/0001.pdf',
  'recibo emitido, com o caminho do PDF no formato ano/0001.pdf');

select is(
  (select recibo_numero from public.vw_recebimentos where id = '00000000-0000-0000-0000-0000000000b2'),
  1, 'vw_recebimentos mostra o recibo emitido');

select is(
  (select total_parcelas from public.vw_recebimentos where id = '00000000-0000-0000-0000-0000000000b2'),
  1, 'vw_recebimentos traz o total de parcelas (sem contar o sinal)');

-- -----------------------------------------------------------------------------
-- PDF do recibo: caminho certo, uma vez só
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ update public.recibos set arquivo_pdf = 'outro/lugar.pdf'
      where recebimento_id = '00000000-0000-0000-0000-0000000000b2' $$,
  '23514', null,
  'PDF fora do caminho do recibo é rejeitado');

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('recibos', extract(year from public.hoje())::int || '/0002.pdf') $$,
  '42501', null,
  'storage: não aceita PDF de recibo que não existe');

select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('recibos', extract(year from public.hoje())::int || '/0001.pdf') $$,
  'storage: aceita o PDF do recibo ainda sem arquivo');

select lives_ok(
  $$ update public.recibos set arquivo_pdf = public.caminho_pdf_recibo(ano, numero)
      where recebimento_id = '00000000-0000-0000-0000-0000000000b2' $$,
  'recibo recebe o caminho do PDF');

select throws_ok(
  $$ update public.recibos set arquivo_pdf = null
      where recebimento_id = '00000000-0000-0000-0000-0000000000b2' $$,
  '23514', 'O PDF deste recibo já foi arquivado e não pode ser trocado.',
  'PDF arquivado não pode ser removido nem trocado');

update storage.objects set metadata = '{"trocado": true}'
 where bucket_id = 'recibos' and name = extract(year from public.hoje())::int || '/0001.pdf';

select is(
  (select metadata from storage.objects
    where bucket_id = 'recibos' and name = extract(year from public.hoje())::int || '/0001.pdf'),
  null, 'storage: PDF do recibo não pode ser sobrescrito');

select throws_ok(
  $$ delete from storage.objects where bucket_id = 'recibos' $$,
  null, null,
  'storage: PDF do recibo não pode ser apagado');

-- -----------------------------------------------------------------------------
-- Cancelamento
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ update public.recibos set status = 'cancelado'
      where recebimento_id = '00000000-0000-0000-0000-0000000000b2' $$,
  '23514', 'Informe o motivo do cancelamento do recibo.',
  'cancelar recibo exige motivo');

select throws_ok(
  $$ update public.recibos set status = 'cancelado', motivo_cancelamento = '   '
      where recebimento_id = '00000000-0000-0000-0000-0000000000b2' $$,
  '23514', 'Informe o motivo do cancelamento do recibo.',
  'motivo em branco não vale');

select lives_ok(
  $$ update public.recibos set status = 'cancelado', motivo_cancelamento = 'Nome do cliente errado'
      where recebimento_id = '00000000-0000-0000-0000-0000000000b2' $$,
  'recibo cancelado com motivo');

select throws_ok(
  $$ update public.recibos set motivo_cancelamento = 'Outro motivo'
      where recebimento_id = '00000000-0000-0000-0000-0000000000b2' $$,
  '23514', 'O motivo do cancelamento não pode ser alterado.',
  'motivo do cancelamento fica registrado');

select is(
  (select numero from public.emitir_recibo('00000000-0000-0000-0000-0000000000b2')),
  2, 'recebimento com recibo cancelado ganha recibo novo, com número novo');

select is(
  (select count(*)::int from public.recibos where recebimento_id = '00000000-0000-0000-0000-0000000000b2'),
  2, 'o recibo cancelado continua no histórico');

reset role;

select * from finish();
rollback;
