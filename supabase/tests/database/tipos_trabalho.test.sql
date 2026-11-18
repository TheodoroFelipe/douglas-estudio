-- Tipos de trabalho cadastráveis (pgTAP).
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

-- -----------------------------------------------------------------------------
-- Cadastro
-- -----------------------------------------------------------------------------
select ok(
  (select count(*) from public.tipos_trabalho where chave in ('formatura', 'ensaio', 'casamento', 'evento', 'outro')) = 5,
  'os 5 tipos de antes já vêm cadastrados');

insert into public.tipos_trabalho (nome) values ('  Batizado  ');
select is(
  (select chave || '|' || nome from public.tipos_trabalho where nome = 'Batizado'),
  'batizado|Batizado', 'tipo novo ganha a chave pelo nome, sem espaços nas pontas');

select throws_ok(
  $$ insert into public.tipos_trabalho (nome) values ('BATIZADO') $$,
  '23505', null,
  'nome repetido (maiúsculas) é recusado');

select throws_ok(
  $$ insert into public.tipos_trabalho (nome) values ('Formatúra') $$,
  '23505', null,
  'nome repetido (acento) é recusado');

insert into public.tipos_trabalho (nome) values ('Ensaio gestante!');
insert into public.tipos_trabalho (nome) values ('Ensaio-gestante');
select results_eq(
  $$ select chave from public.tipos_trabalho where nome like 'Ensaio%gestante%' order by chave $$,
  $$ values ('ensaio_gestante'::text), ('ensaio_gestante_2') $$,
  'chaves sem acento nem símbolos, e sem repetir');

select throws_ok(
  $$ update public.tipos_trabalho set chave = 'outra' where chave = 'batizado' $$,
  '23514', 'A chave do tipo de trabalho não pode ser alterada.',
  'chave não muda');

select lives_ok(
  $$ update public.tipos_trabalho set nome = 'Batizado e crisma' where chave = 'batizado' $$,
  'renomear é permitido');

-- -----------------------------------------------------------------------------
-- Uso no trabalho
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ select public.salvar_trabalho(
       jsonb_build_object('cliente_id', '00000000-0000-0000-0000-0000000000c1', 'tipo', 'batizado',
                          'descricao', 'Batizado do Pedro', 'valor_total', '400.00'),
       jsonb_build_array(jsonb_build_object('numero', 0, 'valor', '400.00', 'vencimento', '2026-12-01'))) $$,
  'trabalho usa o tipo novo');

select throws_ok(
  $$ select public.salvar_trabalho(
       jsonb_build_object('cliente_id', '00000000-0000-0000-0000-0000000000c1', 'tipo', 'nao_existe',
                          'descricao', 'Tipo inválido', 'valor_total', '400.00'),
       jsonb_build_array(jsonb_build_object('numero', 0, 'valor', '400.00', 'vencimento', '2026-12-01'))) $$,
  '23503', null,
  'tipo que não existe é recusado');

select throws_ok(
  $$ delete from public.tipos_trabalho where chave = 'batizado' $$,
  '23503', null,
  'tipo com trabalhos não pode ser apagado');

select lives_ok(
  $$ delete from public.tipos_trabalho where chave = 'ensaio_gestante_2' $$,
  'tipo sem trabalhos pode ser apagado');

-- Desativado: some das opções de trabalho novo, mas os antigos seguem editáveis.
update public.tipos_trabalho set ativo = false where chave = 'batizado';

select throws_ok(
  $$ select public.salvar_trabalho(
       jsonb_build_object('cliente_id', '00000000-0000-0000-0000-0000000000c1', 'tipo', 'batizado',
                          'descricao', 'Outro batizado', 'valor_total', '400.00'),
       jsonb_build_array(jsonb_build_object('numero', 0, 'valor', '400.00', 'vencimento', '2026-12-01'))) $$,
  '23514', 'O tipo "Batizado e crisma" está desativado. Reative em Tipos de trabalho ou escolha outro.',
  'tipo desativado não entra em trabalho novo');

select lives_ok(
  $$ update public.trabalhos set descricao = 'Batizado do Pedro Henrique' where descricao = 'Batizado do Pedro' $$,
  'trabalho antigo de tipo desativado continua editável');

select lives_ok(
  $$ select public.salvar_trabalho(
       jsonb_build_object('cliente_id', '00000000-0000-0000-0000-0000000000c1', 'tipo', 'ensaio',
                          'descricao', 'Ensaio da Ana', 'valor_total', '300.00'),
       jsonb_build_array(jsonb_build_object('numero', 0, 'valor', '300.00', 'vencimento', '2026-12-01'))) $$,
  'trabalho de outro tipo');

select throws_ok(
  $$ update public.trabalhos set tipo = 'batizado' where descricao = 'Ensaio da Ana' $$,
  '23514', null,
  'trocar para um tipo desativado é recusado');

update public.tipos_trabalho set ativo = true where chave = 'batizado';
select lives_ok(
  $$ update public.trabalhos set tipo = 'batizado' where descricao = 'Ensaio da Ana' $$,
  'reativado, o tipo volta a ser aceito');

-- -----------------------------------------------------------------------------
-- Permissões
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}', true);

select is((select count(*)::int from public.tipos_trabalho), 0, 'sem perfil: não vê os tipos');
select throws_ok(
  $$ insert into public.tipos_trabalho (nome) values ('Invasor') $$,
  '42501', null,
  'sem perfil: não cadastra tipo');

reset role;

select * from finish();
rollback;
