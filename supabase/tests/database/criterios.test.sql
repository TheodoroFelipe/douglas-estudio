-- Critérios de aceite do MVP no nível do banco (pgTAP).
-- Rodar com: npx supabase test db
-- Tudo roda numa transação desfeita no final.

begin;
select no_plan();

-- As verificações deferidas (soma das parcelas) rodam a cada comando,
-- já que a transação do teste nunca chega ao commit.
set constraints all immediate;

-- -----------------------------------------------------------------------------
-- Usuários de teste: admin, dono e um autenticado sem perfil
-- -----------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@teste.local'),
  ('00000000-0000-0000-0000-00000000000d', 'dono@teste.local'),
  ('00000000-0000-0000-0000-00000000000e', 'estranho@teste.local');

insert into public.perfis (id, nome, papel) values
  ('00000000-0000-0000-0000-00000000000a', 'Theodoro', 'admin'),
  ('00000000-0000-0000-0000-00000000000d', 'Douglas', 'dono');

-- Dados do estúdio exigidos no recibo (preenchidos pelo admin em Configurações).
update public.configuracoes
   set razao_social = 'Douglas Guimarães Fotografia LTDA', cnpj = '11444777000161',
       endereco = 'Rua Teste, 100', responsavel_assinatura = 'Douglas Guimarães', logo_path = 'logo';

-- Daqui em diante, como o dono.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);

insert into public.clientes (id, nome, tipo_pessoa, cpf_cnpj, endereco) values
  ('00000000-0000-0000-0000-0000000000c1', 'Comissão Medicina UNILA 2026', 'PJ', '11222333000181',
   'Av. Tancredo Neves, 6731, Foz do Iguaçu/PR');

-- -----------------------------------------------------------------------------
-- Trabalho com plano de parcelas
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ select public.salvar_trabalho(
       jsonb_build_object(
         'cliente_id', '00000000-0000-0000-0000-0000000000c1',
         'tipo', 'formatura',
         'descricao', 'Formatura Medicina UNILA 2026',
         'valor_total', '3000.00'),
       (select jsonb_agg(jsonb_build_object(
                 'numero', n,
                 'valor', case when n = 0 then '600.00' else '300.00' end,
                 'vencimento', case when n = 0 then public.hoje() - 5
                                    else (public.hoje() + make_interval(months => n))::date end))
          from generate_series(0, 8) n)) $$,
  'formatura de R$ 3.000 = sinal 600 + 8 × 300 é aceita');

select is(
  (select count(*)::int from public.parcelas p
     join public.trabalhos t on t.id = p.trabalho_id
    where t.descricao = 'Formatura Medicina UNILA 2026'),
  9, 'plano gravado com sinal + 8 parcelas');

select throws_ok(
  $$ select public.salvar_trabalho(
       jsonb_build_object(
         'cliente_id', '00000000-0000-0000-0000-0000000000c1',
         'tipo', 'ensaio', 'descricao', 'Ensaio com soma errada', 'valor_total', '3000.00'),
       '[{"numero": 0, "valor": "600.00", "vencimento": "2026-12-01"},
         {"numero": 1, "valor": "300.00", "vencimento": "2027-01-01"}]'::jsonb) $$,
  '23514', null,
  'plano cuja soma não bate com o total é rejeitado');

select throws_ok(
  $$ update public.trabalhos set valor_total = 3500
      where descricao = 'Formatura Medicina UNILA 2026' $$,
  '23514', null,
  'mudar o valor total sem ajustar as parcelas é rejeitado');

select is(
  (select status from public.trabalhos where descricao = 'Formatura Medicina UNILA 2026'),
  'orcamento', 'trabalho novo começa como orçamento');

-- Edição do plano com a verificação deferida, como no app (checada no "commit",
-- simulado com set constraints all immediate): sobe o total para 3.200 com uma
-- 9ª parcela e depois volta para 3.000 apagando-a.
set constraints all deferred;

select lives_ok(
  $$ select public.salvar_trabalho(
       to_jsonb(t) || '{"valor_total": "3200.00"}'::jsonb,
       (select jsonb_agg(jsonb_build_object('id', p.id, 'numero', p.numero,
                                            'valor', p.valor::text, 'vencimento', p.vencimento))
          from public.parcelas p where p.trabalho_id = t.id)
       || jsonb_build_array(jsonb_build_object(
            'numero', 9, 'valor', '200.00', 'vencimento', public.hoje() + 300)))
     from public.trabalhos t where t.descricao = 'Formatura Medicina UNILA 2026' $$,
  'edição: novo total com parcela incluída');

select lives_ok('set constraints all immediate', 'edição: soma confere no fim da transação');
set constraints all deferred;

select lives_ok(
  $$ select public.salvar_trabalho(
       to_jsonb(t) || '{"valor_total": "3000.00"}'::jsonb,
       (select jsonb_agg(jsonb_build_object('id', p.id, 'numero', p.numero,
                                            'valor', p.valor::text, 'vencimento', p.vencimento))
          from public.parcelas p where p.trabalho_id = t.id and p.numero <= 8))
     from public.trabalhos t where t.descricao = 'Formatura Medicina UNILA 2026' $$,
  'edição: parcela removida do plano');

select lives_ok('set constraints all immediate', 'edição: soma volta a conferir');

select results_eq(
  $$ select count(*)::int, sum(p.valor), max(t.valor_total)
       from public.parcelas p join public.trabalhos t on t.id = p.trabalho_id
      where t.descricao = 'Formatura Medicina UNILA 2026' $$,
  $$ values (9, 3000.00::numeric, 3000.00::numeric(12,2)) $$,
  'edição: plano final com 9 parcelas somando 3.000');

-- -----------------------------------------------------------------------------
-- Recebimento do sinal e status da parcela
-- -----------------------------------------------------------------------------
select is(
  (select ps.status from public.vw_parcelas_status ps
     join public.trabalhos t on t.id = ps.trabalho_id
    where t.descricao = 'Formatura Medicina UNILA 2026' and ps.numero = 0),
  'vencida', 'sinal vencido e não pago aparece como vencido');

select ok(
  exists (select 1 from public.vw_alertas where tipo = 'parcela_vencida'),
  'alerta de parcela vencida aparece');

insert into public.recebimentos (id, trabalho_id, parcela_id, valor, forma_pagamento)
select '00000000-0000-0000-0000-0000000000b1', t.id, p.id, 600.00, 'pix'
  from public.trabalhos t
  join public.parcelas p on p.trabalho_id = t.id and p.numero = 0
 where t.descricao = 'Formatura Medicina UNILA 2026';

select is(
  (select ps.status from public.vw_parcelas_status ps
     join public.trabalhos t on t.id = ps.trabalho_id
    where t.descricao = 'Formatura Medicina UNILA 2026' and ps.numero = 0),
  'paga', 'sinal muda para paga após o recebimento');

select is(
  (select status from public.trabalhos where descricao = 'Formatura Medicina UNILA 2026'),
  'em_andamento', 'primeiro recebimento passa o trabalho para em andamento');

select ok(
  not exists (select 1 from public.vw_alertas where tipo = 'parcela_vencida'),
  'alerta de parcela vencida some depois do pagamento');

select ok(
  exists (select 1 from public.vw_alertas
           where tipo = 'recibo_pendente' and referencia_id = '00000000-0000-0000-0000-0000000000b1'),
  'recebimento sem recibo gera alerta');

-- -----------------------------------------------------------------------------
-- Recibos: numeração sequencial por ano
-- -----------------------------------------------------------------------------
select is(
  (select ano || '/' || lpad(numero::text, 4, '0')
     from public.emitir_recibo('00000000-0000-0000-0000-0000000000b1')),
  extract(year from public.hoje())::int || '/0001',
  'primeiro recibo do ano é ' || extract(year from public.hoje())::int || '/0001');

select ok(
  not exists (select 1 from public.vw_alertas where tipo = 'recibo_pendente'),
  'alerta de recibo pendente some após emitir');

select throws_ok(
  $$ select public.emitir_recibo('00000000-0000-0000-0000-0000000000b1') $$,
  '23505', null,
  'não emite segundo recibo para o mesmo recebimento');

insert into public.recebimentos (id, trabalho_id, parcela_id, valor, forma_pagamento, taxa)
select '00000000-0000-0000-0000-0000000000b2', t.id, p.id, 300.00, 'cartao_credito', 9.00
  from public.trabalhos t
  join public.parcelas p on p.trabalho_id = t.id and p.numero = 1
 where t.descricao = 'Formatura Medicina UNILA 2026';

select is(
  (select numero from public.emitir_recibo('00000000-0000-0000-0000-0000000000b2')),
  2, 'segundo recibo recebe o número seguinte');

select throws_ok(
  $$ update public.recebimentos set valor = 350
      where id = '00000000-0000-0000-0000-0000000000b2' $$,
  '23514', null,
  'valor de recebimento com recibo emitido não pode mudar');

select throws_ok(
  $$ insert into public.recibos (recebimento_id, ano, numero)
     values ('00000000-0000-0000-0000-0000000000b2', 2026, 99) $$,
  '42501', null,
  'recibo só é criado por emitir_recibo()');

-- Estorno cancela o recibo.
update public.recebimentos set status = 'estornado'
 where id = '00000000-0000-0000-0000-0000000000b2';

select is(
  (select status from public.recibos where recebimento_id = '00000000-0000-0000-0000-0000000000b2'),
  'cancelado', 'estornar o recebimento cancela o recibo');

-- -----------------------------------------------------------------------------
-- Conclusão e nota fiscal
-- -----------------------------------------------------------------------------
update public.trabalhos set status = 'concluido'
 where descricao = 'Formatura Medicina UNILA 2026';

select is(
  (select data_conclusao from public.trabalhos where descricao = 'Formatura Medicina UNILA 2026'),
  public.hoje(), 'concluir preenche a data de conclusão');

select ok(
  exists (select 1 from public.vw_alertas a
            join public.trabalhos t on t.id = a.trabalho_id
           where a.tipo = 'nota_pendente' and t.descricao = 'Formatura Medicina UNILA 2026'),
  'trabalho concluído sem nota gera o alerta "nota pendente"');

insert into public.notas_fiscais (id, trabalho_id, numero, chave_acesso, data_emissao, data_competencia, valor_servico)
select '00000000-0000-0000-0000-0000000000f1', t.id, '42', repeat('1', 50), public.hoje(), public.hoje(), 3000.00
  from public.trabalhos t
 where t.descricao = 'Formatura Medicina UNILA 2026';

select ok(
  not exists (select 1 from public.vw_alertas where tipo = 'nota_pendente'),
  'alerta "nota pendente" some após cadastrar a NFS-e');

select is(
  (select codigo_servico from public.notas_fiscais where id = '00000000-0000-0000-0000-0000000000f1'),
  '13.03.01', 'nota nova vem com o código de serviço padrão 13.03.01');

select throws_ok(
  $$ insert into public.notas_fiscais (trabalho_id, numero, chave_acesso, data_emissao, data_competencia, valor_servico)
     select t.id, '43', repeat('2', 50), public.hoje(), public.hoje(), 3000.00
       from public.trabalhos t where t.descricao = 'Formatura Medicina UNILA 2026' $$,
  '23505', null,
  'impede uma segunda nota ativa no mesmo trabalho');

select lives_ok(
  $$ insert into public.notas_fiscais (trabalho_id, numero, chave_acesso, data_emissao, data_competencia,
                                       valor_servico, nota_substituida_id)
     select t.id, '44', repeat('3', 50), public.hoje(), public.hoje(), 2900.00,
            '00000000-0000-0000-0000-0000000000f1'
       from public.trabalhos t where t.descricao = 'Formatura Medicina UNILA 2026' $$,
  'nota substituta é aceita');

select is(
  (select status from public.notas_fiscais where id = '00000000-0000-0000-0000-0000000000f1'),
  'substituida', 'nota original fica como substituída');

select ok(
  exists (select 1 from public.vw_alertas where tipo = 'nota_divergente'),
  'nota com valor diferente do total gera alerta');

-- -----------------------------------------------------------------------------
-- Despesas e resultado do trabalho
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ insert into public.tipos_despesa (nome, classificacao) values ('Drone', 'direta') $$,
  'dono cadastra um tipo de despesa novo');

select throws_ok(
  $$ insert into public.tipos_despesa (nome, classificacao) values ('  drone ', 'direta') $$,
  '23505', null,
  'nome de tipo de despesa é único (sem diferenciar maiúsculas e espaços)');

select throws_ok(
  $$ insert into public.despesas (tipo_despesa_id, valor)
     select id, 150.00 from public.tipos_despesa where nome = 'Drone' $$,
  '23514', null,
  'despesa de tipo direto sem trabalho é rejeitada');

select throws_ok(
  $$ insert into public.despesas (tipo_despesa_id, trabalho_id, valor)
     select td.id, t.id, 150.00
       from public.tipos_despesa td, public.trabalhos t
      where td.nome = 'Aluguel' and t.descricao = 'Formatura Medicina UNILA 2026' $$,
  '23514', null,
  'despesa de tipo indireto com trabalho é rejeitada');

insert into public.despesas (tipo_despesa_id, trabalho_id, valor)
select td.id, t.id, 200.00
  from public.tipos_despesa td, public.trabalhos t
 where td.nome = 'Drone' and t.descricao = 'Formatura Medicina UNILA 2026';

insert into public.despesas (tipo_despesa_id, valor)
select id, 1000.00 from public.tipos_despesa where nome = 'Aluguel';

select results_eq(
  $$ select total_recebido, despesas_diretas, resultado
       from public.vw_resultado_trabalho where descricao = 'Formatura Medicina UNILA 2026' $$,
  $$ values (600.00::numeric, 200.00::numeric, 400.00::numeric) $$,
  'resultado do trabalho = recebido − despesas diretas (estorno não conta)');

select results_eq(
  $$ select recebido, faturado_em_nota, despesas_diretas, despesas_indiretas, resultado
       from public.vw_consolidado_mensal
      where mes = date_trunc('month', public.hoje()::timestamp)::date $$,
  $$ values (600.00::numeric, 2900.00::numeric, 200.00::numeric, 1000.00::numeric, -600.00::numeric) $$,
  'consolidado do mês soma recebido, nota ativa e despesas');

select throws_ok(
  $$ update public.tipos_despesa set classificacao = 'indireta' where nome = 'Drone' $$,
  '23514', null,
  'tipo com despesas não muda de classificação');

-- -----------------------------------------------------------------------------
-- Permissões (RLS)
-- -----------------------------------------------------------------------------
-- O dono não altera configurações nem o próprio papel (o update afeta 0 linhas).
update public.configuracoes set codigo_servico_padrao = '99.99.99';
update public.perfis set papel = 'admin' where id = '00000000-0000-0000-0000-00000000000d';

reset role;

select is(
  (select codigo_servico_padrao from public.configuracoes),
  '13.03.01', 'dono não consegue alterar as configurações');

select is(
  (select papel from public.perfis where id = '00000000-0000-0000-0000-00000000000d'),
  'dono', 'dono não consegue se promover a admin');

-- Usuário autenticado sem perfil não vê nada.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}', true);

select is((select count(*)::int from public.clientes), 0, 'sem perfil: não vê clientes');
select is((select count(*)::int from public.vw_conciliacao_trabalho), 0, 'sem perfil: views voltam vazias');
select throws_ok(
  $$ select public.emitir_recibo('00000000-0000-0000-0000-0000000000b1') $$,
  '42501', null,
  'sem perfil: não emite recibo');

-- O admin altera as configurações.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
update public.configuracoes set descricao_servico_padrao = 'Serviços de fotografia e filmagem';
select is(
  (select descricao_servico_padrao from public.configuracoes),
  'Serviços de fotografia e filmagem', 'admin altera as configurações');

-- Anônimo não tem acesso nenhum.
set local role anon;
select throws_ok(
  $$ select count(*) from public.clientes $$,
  '42501', null,
  'anônimo não acessa as tabelas');

reset role;

select * from finish();
rollback;
