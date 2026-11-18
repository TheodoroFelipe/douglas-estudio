-- Fase 4: notas fiscais (pgTAP).
-- Chaves de acesso fictícias, com dígito verificador válido, do CNPJ de teste
-- 11.444.777/0001-61. Tudo roda numa transação desfeita no final.

begin;
select no_plan();

set constraints all immediate;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000d', 'dono@teste.local');
insert into public.perfis (id, nome, papel) values
  ('00000000-0000-0000-0000-00000000000d', 'Douglas', 'dono');

update public.configuracoes set cnpj = '11444777000161';

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

-- -----------------------------------------------------------------------------
-- Só em trabalho concluído
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.notas_fiscais (trabalho_id, numero, chave_acesso, data_emissao, data_competencia, valor_servico)
     values ('00000000-0000-0000-0000-0000000000f1', '45', '41083042211444777000161000000000004526111234567890',
             public.hoje(), public.hoje(), 1000.00) $$,
  '23514', 'Conclua o trabalho antes de registrar a nota fiscal.',
  'trabalho em orçamento não recebe nota');

update public.trabalhos set status = 'concluido' where id = '00000000-0000-0000-0000-0000000000f1';

-- -----------------------------------------------------------------------------
-- Chave de acesso
-- -----------------------------------------------------------------------------
select ok(public.chave_nfse_valida('41083042211444777000161000000000004526111234567890'), 'chave com dígito certo é válida');
select ok(not public.chave_nfse_valida('41083042211444777000161000000000004526111234567891'), 'dígito verificador errado é recusado');
select ok(not public.chave_nfse_valida('4108304221144477700016100000000000452611123456789'), 'chave com 49 dígitos é recusada');

select throws_ok(
  $$ insert into public.notas_fiscais (trabalho_id, numero, chave_acesso, data_emissao, data_competencia, valor_servico)
     values ('00000000-0000-0000-0000-0000000000f1', '45', '41083042211444777000161000000000004526111234567891',
             public.hoje(), public.hoje(), 1000.00) $$,
  '23514', 'Chave de acesso inválida: confira os 50 dígitos.',
  'chave com dígito verificador errado não entra');

select throws_ok(
  $$ insert into public.notas_fiscais (trabalho_id, numero, chave_acesso, data_emissao, data_competencia, valor_servico)
     values ('00000000-0000-0000-0000-0000000000f1', '46', '41083042211444777000161000000000004526111234567890',
             public.hoje(), public.hoje(), 1000.00) $$,
  '23514', 'O número da nota (46) não confere com a chave de acesso (nota 45).',
  'número diferente do que está na chave é recusado');

select throws_ok(
  $$ insert into public.notas_fiscais (trabalho_id, numero, chave_acesso, data_emissao, data_competencia, valor_servico)
     values ('00000000-0000-0000-0000-0000000000f1', '51', '41083042211222333000181000000000005126111234567895',
             public.hoje(), public.hoje(), 1000.00) $$,
  '23514', 'A chave de acesso é de uma nota de outro CNPJ, não do estúdio.',
  'nota de outro CNPJ é recusada');

select throws_ok(
  $$ insert into public.notas_fiscais (trabalho_id, numero, chave_acesso, data_emissao, data_competencia, valor_servico)
     values ('00000000-0000-0000-0000-0000000000f1', '45', '41083042211444777000161000000000004526111234567890',
             public.hoje() + 1, public.hoje(), 1000.00) $$,
  '23514', 'A data de emissão não pode ser futura.',
  'data de emissão futura é recusada');

select lives_ok(
  $$ insert into public.notas_fiscais (id, trabalho_id, numero, chave_acesso, data_emissao, data_competencia, valor_servico)
     values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1', ' 0045 ',
             '41083042211444777000161000000000004526111234567890', public.hoje(), public.hoje(), 1000.00) $$,
  'nota com chave, número e CNPJ certos entra');

select is(
  (select numero from public.notas_fiscais where id = '00000000-0000-0000-0000-0000000000e1'),
  '0045', 'número gravado sem espaços');

select ok(
  not exists (select 1 from public.vw_alertas where tipo = 'nota_pendente' and trabalho_id = '00000000-0000-0000-0000-0000000000f1'),
  'trabalho com nota não fica pendente');

-- -----------------------------------------------------------------------------
-- Arquivos
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ update public.notas_fiscais set arquivo_pdf = 'outra/nota.pdf' where id = '00000000-0000-0000-0000-0000000000e1' $$,
  '23514', null,
  'PDF fora do caminho da nota é recusado');

select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('notas-fiscais', '00000000-0000-0000-0000-0000000000e1/nota.pdf') $$,
  'storage: aceita o PDF da nota emitida no caminho dela');

select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('notas-fiscais', 'qualquer/coisa.pdf') $$,
  '42501', null,
  'storage: recusa arquivo que não é de nota emitida');

select lives_ok(
  $$ update public.notas_fiscais
        set arquivo_pdf = '00000000-0000-0000-0000-0000000000e1/nota.pdf',
            arquivo_xml = '00000000-0000-0000-0000-0000000000e1/nota.xml'
      where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'nota recebe os caminhos do PDF e do XML');

update storage.objects set metadata = '{"trocado": true}'
 where bucket_id = 'notas-fiscais' and name = '00000000-0000-0000-0000-0000000000e1/nota.pdf';
select is(
  (select metadata->>'trocado' from storage.objects
    where bucket_id = 'notas-fiscais' and name = '00000000-0000-0000-0000-0000000000e1/nota.pdf'),
  'true', 'storage: arquivo de nota emitida pode ser trocado');

-- -----------------------------------------------------------------------------
-- Uma ativa por trabalho, cancelamento e substituição
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.notas_fiscais (trabalho_id, numero, chave_acesso, data_emissao, data_competencia, valor_servico)
     values ('00000000-0000-0000-0000-0000000000f1', '46', '41083042211444777000161000000000004626111234567894',
             public.hoje(), public.hoje(), 1000.00) $$,
  '23505', null,
  'segunda nota ativa no mesmo trabalho é recusada');

select throws_ok(
  $$ update public.notas_fiscais set status = 'cancelada' where id = '00000000-0000-0000-0000-0000000000e1' $$,
  '23514', 'Informe o motivo do cancelamento da nota.',
  'cancelar exige motivo');

select throws_ok(
  $$ update public.notas_fiscais set motivo_cancelamento = 'x' where id = '00000000-0000-0000-0000-0000000000e1' $$,
  '23514', 'Só nota cancelada tem motivo de cancelamento.',
  'nota emitida não tem motivo');

-- Configuração mudou depois do registro: cancelar continua possível.
reset role;
update public.configuracoes set cnpj = '11222333000181';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);

select lives_ok(
  $$ update public.notas_fiscais set status = 'cancelada', motivo_cancelamento = 'Tomador errado'
      where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'nota cancelada com motivo');

reset role;
update public.configuracoes set cnpj = '11444777000161';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);

select throws_ok(
  $$ update public.notas_fiscais set motivo_cancelamento = 'Outro' where id = '00000000-0000-0000-0000-0000000000e1' $$,
  '23514', 'Nota cancelada ou substituída não pode ser alterada.',
  'nota cancelada fica travada');

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('notas-fiscais', '00000000-0000-0000-0000-0000000000e1/nota.xml') $$,
  '42501', null,
  'storage: nota cancelada não recebe arquivo');

select ok(
  exists (select 1 from public.vw_alertas where tipo = 'nota_pendente' and trabalho_id = '00000000-0000-0000-0000-0000000000f1'),
  'com a nota cancelada, o trabalho volta a ficar pendente');

select lives_ok(
  $$ insert into public.notas_fiscais (id, trabalho_id, numero, chave_acesso, data_emissao, data_competencia, valor_servico)
     values ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000f1', '46',
             '41083042211444777000161000000000004626111234567894', public.hoje(), public.hoje(), 1000.00) $$,
  'depois de cancelar, uma nota nova pode ser registrada');

select lives_ok(
  $$ insert into public.notas_fiscais (id, trabalho_id, numero, chave_acesso, data_emissao, data_competencia,
                                       valor_servico, nota_substituida_id)
     values ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000f1', '47',
             '41083042211444777000161000000000004726111234567898', public.hoje(), public.hoje(), 1000.00,
             '00000000-0000-0000-0000-0000000000e2') $$,
  'substituição registra a nota nova');

select results_eq(
  $$ select status from public.notas_fiscais where trabalho_id = '00000000-0000-0000-0000-0000000000f1' order by numero $$,
  $$ values ('cancelada'::text), ('substituida'), ('emitida') $$,
  'histórico: cancelada, substituída e a nova emitida');

select throws_ok(
  $$ update public.trabalhos set status = 'em_andamento' where id = '00000000-0000-0000-0000-0000000000f1' $$,
  '23514', null,
  'com nota emitida o trabalho não é reaberto');

reset role;

select * from finish();
rollback;
