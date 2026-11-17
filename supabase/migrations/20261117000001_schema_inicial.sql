-- =============================================================================
-- Sistema Douglas Fotos — schema inicial
-- Tabelas, índices, funções, triggers, views, RLS e buckets do Storage.
-- Regras de negócio: ver CLAUDE.md e docs/ESPECIFICACAO_MVP.md.
-- =============================================================================


-- =============================================================================
-- 1. Funções utilitárias
-- =============================================================================

-- Data de hoje no fuso do estúdio. O servidor roda em UTC; sem isto, entre
-- 21h e meia-noite o banco já estaria no dia seguinte.
create function public.hoje()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

create function public.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;


-- =============================================================================
-- 2. Usuários e configurações
-- =============================================================================

create table public.perfis (
  id            uuid primary key references auth.users (id) on delete cascade,
  nome          text not null check (btrim(nome) <> ''),
  papel         text not null check (papel in ('admin', 'dono')),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.perfis is
  'Usuários com acesso ao sistema. Sem linha aqui, o usuário autenticado não vê nada.';

-- security definer: lê perfis sem passar pelo RLS (evita recursão nas políticas).
create function public.eh_usuario()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.perfis where id = (select auth.uid()));
$$;

create function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis where id = (select auth.uid()) and papel = 'admin'
  );
$$;

-- Linha única com os dados do estúdio e os padrões fiscais.
create table public.configuracoes (
  id                       boolean primary key default true check (id),
  razao_social             text,
  nome_fantasia            text not null default 'Douglas Guimarães Fotografia',
  cnpj                     text check (cnpj ~ '^[0-9]{14}$'),
  inscricao_municipal      text,
  endereco                 text,
  cidade                   text not null default 'Foz do Iguaçu',
  uf                       text not null default 'PR' check (uf ~ '^[A-Z]{2}$'),
  telefone                 text,
  email                    text,
  responsavel_assinatura   text,
  logo_path                text,
  codigo_servico_padrao    text not null default '13.03.01',
  descricao_servico_padrao text not null default 'Serviços de fotografia',
  aliquota_iss_padrao      numeric(5,2) check (aliquota_iss_padrao between 0 and 100),
  atualizado_em            timestamptz not null default now(),
  atualizado_por           uuid default auth.uid() references auth.users (id) on delete set null
);

comment on column public.configuracoes.logo_path is 'Caminho do logo no bucket "estudio" (PNG ou JPEG).';


-- =============================================================================
-- 3. Clientes e trabalhos
-- =============================================================================

create table public.clientes (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (btrim(nome) <> ''),
  tipo_pessoa   text not null default 'PF' check (tipo_pessoa in ('PF', 'PJ')),
  cpf_cnpj      text unique,
  telefone      text,
  email         text,
  endereco      text,
  observacoes   text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por    uuid default auth.uid() references auth.users (id) on delete set null,
  -- Só dígitos; o dígito verificador é validado no front (Zod).
  -- Opcional no cadastro, exigido ao emitir recibo.
  constraint clientes_cpf_cnpj_formato check (
    cpf_cnpj is null
    or (tipo_pessoa = 'PF' and cpf_cnpj ~ '^[0-9]{11}$')
    or (tipo_pessoa = 'PJ' and cpf_cnpj ~ '^[0-9]{14}$')
  )
);

create index clientes_nome_idx on public.clientes (lower(nome));

create table public.trabalhos (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.clientes (id) on delete restrict,
  tipo            text not null check (tipo in ('formatura', 'ensaio', 'casamento', 'evento', 'outro')),
  descricao       text not null check (btrim(descricao) <> ''),
  data_evento     date,
  data_conclusao  date,
  valor_total     numeric(12,2) not null check (valor_total > 0),
  numero_contrato text,
  status          text not null default 'orcamento'
                  check (status in ('orcamento', 'em_andamento', 'concluido', 'cancelado')),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  criado_por      uuid default auth.uid() references auth.users (id) on delete set null,
  constraint trabalhos_conclusao_coerente check ((status = 'concluido') = (data_conclusao is not null))
);

create index trabalhos_cliente_idx on public.trabalhos (cliente_id);
create index trabalhos_status_idx on public.trabalhos (status);

-- Ao concluir, preenche data_conclusao com hoje (se não informada);
-- ao sair de "concluido", limpa a data.
create function public.ajustar_conclusao_trabalho()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'concluido' then
    new.data_conclusao := coalesce(new.data_conclusao, public.hoje());
  else
    new.data_conclusao := null;
  end if;
  return new;
end;
$$;

create trigger trabalhos_ajustar_conclusao
  before insert or update of status, data_conclusao on public.trabalhos
  for each row execute function public.ajustar_conclusao_trabalho();


-- =============================================================================
-- 4. Parcelas
-- =============================================================================

create table public.parcelas (
  id            uuid primary key default gen_random_uuid(),
  trabalho_id   uuid not null references public.trabalhos (id) on delete restrict,
  numero        int not null check (numero >= 0),   -- 0 = sinal
  valor         numeric(12,2) not null check (valor > 0),
  vencimento    date not null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por    uuid default auth.uid() references auth.users (id) on delete set null,
  -- Deferrable para permitir renumerar parcelas dentro de uma transação.
  constraint parcelas_numero_unico unique (trabalho_id, numero) deferrable initially deferred
);

create index parcelas_trabalho_idx on public.parcelas (trabalho_id);

create function public.bloquear_troca_trabalho_parcela()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.trabalho_id <> old.trabalho_id then
    raise exception 'Uma parcela não pode ser movida para outro trabalho.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger parcelas_bloquear_troca_trabalho
  before update of trabalho_id on public.parcelas
  for each row execute function public.bloquear_troca_trabalho_parcela();

-- Soma das parcelas = valor total do trabalho (quando há parcelas).
-- Verificada no fim da transação (constraint trigger deferida), para que o
-- trabalho e o plano de parcelas possam ser gravados juntos por salvar_trabalho().
create function public.verificar_soma_parcelas()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_trabalho_id uuid;
  v_total       numeric(12,2);
  v_soma        numeric(12,2);
begin
  if tg_table_name = 'trabalhos' then
    v_trabalho_id := new.id;
  elsif tg_op = 'DELETE' then
    v_trabalho_id := old.trabalho_id;
  else
    v_trabalho_id := new.trabalho_id;
  end if;

  select t.valor_total, sum(p.valor)
    into v_total, v_soma
    from public.trabalhos t
    left join public.parcelas p on p.trabalho_id = t.id
   where t.id = v_trabalho_id
   group by t.valor_total;

  if v_soma is not null and v_soma <> v_total then
    raise exception 'A soma das parcelas (%) é diferente do valor total do trabalho (%).',
      v_soma, v_total
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

create constraint trigger parcelas_verificar_soma
  after insert or update of valor, trabalho_id or delete on public.parcelas
  deferrable initially deferred
  for each row execute function public.verificar_soma_parcelas();

create constraint trigger trabalhos_verificar_soma
  after update of valor_total on public.trabalhos
  deferrable initially deferred
  for each row execute function public.verificar_soma_parcelas();


-- =============================================================================
-- 5. Recebimentos
-- =============================================================================

create table public.recebimentos (
  id               uuid primary key default gen_random_uuid(),
  trabalho_id      uuid not null references public.trabalhos (id) on delete restrict,
  parcela_id       uuid references public.parcelas (id) on delete restrict,
  data_recebimento date not null default public.hoje(),
  valor            numeric(12,2) not null check (valor > 0),
  forma_pagamento  text not null check (forma_pagamento in (
                     'pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia'
                   )),
  -- Taxa da maquininha; entra como despesa direta do trabalho nas views.
  taxa             numeric(12,2) not null default 0 check (taxa >= 0),
  status           text not null default 'confirmado' check (status in ('confirmado', 'estornado')),
  observacoes      text,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  criado_por       uuid default auth.uid() references auth.users (id) on delete set null,
  constraint recebimentos_taxa_menor_que_valor check (taxa <= valor)
);

create index recebimentos_trabalho_idx on public.recebimentos (trabalho_id);
create index recebimentos_parcela_idx on public.recebimentos (parcela_id);
create index recebimentos_data_idx on public.recebimentos (data_recebimento);


-- =============================================================================
-- 6. Recibos e numeração sequencial por ano
-- =============================================================================

-- Último número emitido em cada ano. Alterado só por emitir_recibo()
-- (ou pelo admin, para começar a sequência de um ano de outro número).
create table public.sequencia_recibos (
  ano           int primary key check (ano between 2000 and 2100),
  ultimo_numero int not null default 0 check (ultimo_numero >= 0),
  atualizado_em timestamptz not null default now()
);

create table public.recibos (
  id                  uuid primary key default gen_random_uuid(),
  recebimento_id      uuid not null references public.recebimentos (id) on delete restrict,
  ano                 int not null,
  numero              int not null check (numero > 0),
  data_emissao        date not null default public.hoje(),
  arquivo_pdf         text,
  status              text not null default 'emitido' check (status in ('emitido', 'cancelado')),
  motivo_cancelamento text,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  criado_por          uuid default auth.uid() references auth.users (id) on delete set null,
  constraint recibos_numero_unico unique (ano, numero)
);

-- No máximo um recibo emitido por recebimento (um cancelado pode ser reemitido).
create unique index recibos_um_emitido_por_recebimento
  on public.recibos (recebimento_id) where status = 'emitido';

-- O admin pode ajustar o número inicial, mas nunca abaixo do último já emitido.
create function public.validar_sequencia_recibos()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_maximo int;
begin
  select coalesce(max(numero), 0) into v_maximo from public.recibos where ano = new.ano;
  if new.ultimo_numero < v_maximo then
    raise exception 'O recibo %/% já foi emitido; a sequência não pode voltar para %.',
      new.ano, lpad(v_maximo::text, 4, '0'), new.ultimo_numero
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Só no UPDATE: num INSERT ... ON CONFLICT o BEFORE INSERT dispara com a linha
-- proposta (ultimo_numero = 1) mesmo quando ela vira UPDATE. E um ano novo
-- ainda não tem recibos, então o INSERT não precisa da verificação.
create trigger sequencia_recibos_validar
  before update on public.sequencia_recibos
  for each row execute function public.validar_sequencia_recibos();

-- Recibo emitido é imutável: só pode ganhar o PDF ou ser cancelado.
create function public.proteger_recibo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.recebimento_id <> old.recebimento_id
     or new.ano <> old.ano
     or new.numero <> old.numero
     or new.data_emissao <> old.data_emissao then
    raise exception 'Número, data e recebimento do recibo não podem ser alterados.'
      using errcode = 'check_violation';
  end if;
  if old.status = 'cancelado' and new.status <> 'cancelado' then
    raise exception 'Recibo cancelado não pode voltar a ser emitido. Emita um novo recibo.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger recibos_proteger
  before update on public.recibos
  for each row execute function public.proteger_recibo();

-- Emite o próximo recibo do ano para um recebimento confirmado.
-- security definer: sequencia_recibos não é gravável pelo dono diretamente.
-- O UPDATE do on conflict trava a linha do ano, então emissões simultâneas
-- recebem números distintos e não há buracos (tudo na mesma transação).
create function public.emitir_recibo(p_recebimento_id uuid)
returns public.recibos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recebimento public.recebimentos;
  v_cpf_cnpj    text;
  v_ano         int;
  v_numero      int;
  v_recibo      public.recibos;
begin
  if not public.eh_usuario() then
    raise exception 'Acesso negado.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_recebimento
    from public.recebimentos
   where id = p_recebimento_id
     for update;

  if not found then
    raise exception 'Recebimento não encontrado.' using errcode = 'no_data_found';
  end if;

  if v_recebimento.status <> 'confirmado' then
    raise exception 'Recebimento estornado não pode gerar recibo.' using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.recibos
     where recebimento_id = p_recebimento_id and status = 'emitido'
  ) then
    raise exception 'Este recebimento já tem recibo emitido.' using errcode = 'unique_violation';
  end if;

  select c.cpf_cnpj into v_cpf_cnpj
    from public.trabalhos t
    join public.clientes c on c.id = t.cliente_id
   where t.id = v_recebimento.trabalho_id;

  if v_cpf_cnpj is null then
    raise exception 'Cadastre o CPF/CNPJ do cliente antes de emitir o recibo.'
      using errcode = 'check_violation';
  end if;

  v_ano := extract(year from public.hoje())::int;

  insert into public.sequencia_recibos as s (ano, ultimo_numero)
  values (v_ano, 1)
  on conflict (ano) do update
    set ultimo_numero = s.ultimo_numero + 1,
        atualizado_em = now()
  returning s.ultimo_numero into v_numero;

  insert into public.recibos (recebimento_id, ano, numero, data_emissao)
  values (p_recebimento_id, v_ano, v_numero, public.hoje())
  returning * into v_recibo;

  return v_recibo;
end;
$$;

revoke execute on function public.emitir_recibo(uuid) from public, anon;
grant execute on function public.emitir_recibo(uuid) to authenticated;


-- =============================================================================
-- 7. Regras dos recebimentos (dependem de recibos)
-- =============================================================================

create function public.validar_recebimento()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status_trabalho text;
begin
  -- Estorno é definitivo: só as observações podem mudar depois.
  if tg_op = 'UPDATE' and old.status = 'estornado' then
    if new.status <> 'estornado'
       or (new.trabalho_id, new.parcela_id, new.data_recebimento, new.valor, new.forma_pagamento, new.taxa)
          is distinct from
          (old.trabalho_id, old.parcela_id, old.data_recebimento, old.valor, old.forma_pagamento, old.taxa) then
      raise exception 'Recebimento estornado não pode ser alterado. Lance um novo recebimento.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- Com recibo emitido, os dados impressos no recibo ficam travados.
  if tg_op = 'UPDATE'
     and (new.trabalho_id, new.parcela_id, new.data_recebimento, new.valor, new.forma_pagamento)
         is distinct from
         (old.trabalho_id, old.parcela_id, old.data_recebimento, old.valor, old.forma_pagamento)
     and exists (
       select 1 from public.recibos where recebimento_id = old.id and status = 'emitido'
     ) then
    raise exception 'Este recebimento já tem recibo emitido. Para corrigir, estorne e lance de novo.'
      using errcode = 'check_violation';
  end if;

  if new.parcela_id is not null and not exists (
    select 1 from public.parcelas where id = new.parcela_id and trabalho_id = new.trabalho_id
  ) then
    raise exception 'A parcela informada não pertence a este trabalho.'
      using errcode = 'foreign_key_violation';
  end if;

  if tg_op = 'INSERT' or new.trabalho_id <> old.trabalho_id then
    select status into v_status_trabalho from public.trabalhos where id = new.trabalho_id;
    if v_status_trabalho = 'cancelado' then
      raise exception 'Trabalho cancelado não aceita recebimentos.' using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger recebimentos_validar
  before insert or update on public.recebimentos
  for each row execute function public.validar_recebimento();

-- Primeiro recebimento de um orçamento: o trabalho passa para "em andamento".
create function public.iniciar_trabalho_ao_receber()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.trabalhos
     set status = 'em_andamento'
   where id = new.trabalho_id
     and status = 'orcamento';
  return null;
end;
$$;

create trigger recebimentos_iniciar_trabalho
  after insert on public.recebimentos
  for each row execute function public.iniciar_trabalho_ao_receber();

-- Estorno cancela o recibo emitido do recebimento.
create function public.cancelar_recibo_ao_estornar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'estornado' and old.status <> 'estornado' then
    update public.recibos
       set status = 'cancelado',
           motivo_cancelamento = coalesce(motivo_cancelamento, 'Recebimento estornado')
     where recebimento_id = new.id
       and status = 'emitido';
  end if;
  return null;
end;
$$;

create trigger recebimentos_cancelar_recibo
  after update of status on public.recebimentos
  for each row execute function public.cancelar_recibo_ao_estornar();


-- =============================================================================
-- 8. Notas fiscais (NFS-e final do trabalho, emitida no Emissor Nacional)
-- =============================================================================

create table public.notas_fiscais (
  id                  uuid primary key default gen_random_uuid(),
  trabalho_id         uuid not null references public.trabalhos (id) on delete restrict,
  numero              text not null check (btrim(numero) <> ''),
  chave_acesso        text not null unique check (chave_acesso ~ '^[0-9]{50}$'),
  data_emissao        date not null,
  data_competencia    date not null,
  valor_servico       numeric(12,2) not null check (valor_servico > 0),
  aliquota_iss        numeric(5,2) check (aliquota_iss between 0 and 100),
  codigo_servico      text not null,
  descricao_servico   text not null,
  status              text not null default 'emitida' check (status in ('emitida', 'cancelada', 'substituida')),
  nota_substituida_id uuid references public.notas_fiscais (id) on delete restrict,
  motivo_cancelamento text,
  arquivo_pdf         text,
  arquivo_xml         text,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  criado_por          uuid default auth.uid() references auth.users (id) on delete set null,
  constraint notas_fiscais_substituicao_valida check (nota_substituida_id is distinct from id)
);

-- Regra central: no máximo uma nota ativa por trabalho.
create unique index notas_fiscais_uma_ativa_por_trabalho
  on public.notas_fiscais (trabalho_id) where status = 'emitida';

create index notas_fiscais_trabalho_idx on public.notas_fiscais (trabalho_id);
create index notas_fiscais_competencia_idx on public.notas_fiscais (data_competencia);

create function public.validar_nota_fiscal()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_substituida public.notas_fiscais;
begin
  if tg_op = 'INSERT' then
    -- Padrões das configurações (código 13.03.01, descrição, alíquota).
    new.codigo_servico := coalesce(
      new.codigo_servico, (select codigo_servico_padrao from public.configuracoes), '13.03.01');
    new.descricao_servico := coalesce(
      new.descricao_servico, (select descricao_servico_padrao from public.configuracoes));
    new.aliquota_iss := coalesce(
      new.aliquota_iss, (select aliquota_iss_padrao from public.configuracoes));

    if (select status from public.trabalhos where id = new.trabalho_id) = 'cancelado' then
      raise exception 'Trabalho cancelado não aceita nota fiscal.' using errcode = 'check_violation';
    end if;

    -- Substituição: a nota antiga vira "substituida" antes da nova entrar,
    -- então o índice único de nota ativa continua valendo.
    if new.nota_substituida_id is not null then
      select * into v_substituida from public.notas_fiscais where id = new.nota_substituida_id for update;
      if v_substituida.trabalho_id is distinct from new.trabalho_id then
        raise exception 'A nota substituída precisa ser do mesmo trabalho.' using errcode = 'check_violation';
      end if;
      if v_substituida.status <> 'emitida' then
        raise exception 'Só uma nota emitida pode ser substituída.' using errcode = 'check_violation';
      end if;
      update public.notas_fiscais set status = 'substituida' where id = new.nota_substituida_id;
    end if;
  else
    if old.status <> 'emitida' and (
         new.status <> old.status
         or (new.trabalho_id, new.numero, new.chave_acesso, new.data_emissao, new.data_competencia,
             new.valor_servico, new.aliquota_iss, new.codigo_servico, new.descricao_servico,
             new.nota_substituida_id)
            is distinct from
            (old.trabalho_id, old.numero, old.chave_acesso, old.data_emissao, old.data_competencia,
             old.valor_servico, old.aliquota_iss, old.codigo_servico, old.descricao_servico,
             old.nota_substituida_id)
       ) then
      raise exception 'Nota cancelada ou substituída não pode ser alterada.' using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger notas_fiscais_validar
  before insert or update on public.notas_fiscais
  for each row execute function public.validar_nota_fiscal();


-- =============================================================================
-- 9. Despesas
-- =============================================================================

create table public.tipos_despesa (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (btrim(nome) <> ''),
  classificacao text not null check (classificacao in ('direta', 'indireta')),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por    uuid default auth.uid() references auth.users (id) on delete set null
);

create unique index tipos_despesa_nome_unico on public.tipos_despesa (lower(btrim(nome)));

create table public.despesas (
  id              uuid primary key default gen_random_uuid(),
  tipo_despesa_id uuid not null references public.tipos_despesa (id) on delete restrict,
  trabalho_id     uuid references public.trabalhos (id) on delete restrict,
  data            date not null default public.hoje(),
  valor           numeric(12,2) not null check (valor > 0),
  descricao       text,
  fornecedor      text,
  comprovante     text,
  status          text not null default 'ativa' check (status in ('ativa', 'cancelada')),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  criado_por      uuid default auth.uid() references auth.users (id) on delete set null
);

create index despesas_tipo_idx on public.despesas (tipo_despesa_id);
create index despesas_trabalho_idx on public.despesas (trabalho_id);
create index despesas_data_idx on public.despesas (data);

-- Tipo direto exige trabalho; tipo indireto não tem trabalho; tipo inativo não aceita despesa nova.
create function public.validar_despesa()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_tipo public.tipos_despesa;
begin
  select * into v_tipo from public.tipos_despesa where id = new.tipo_despesa_id;

  if not v_tipo.ativo and (tg_op = 'INSERT' or new.tipo_despesa_id <> old.tipo_despesa_id) then
    raise exception 'O tipo de despesa "%" está desativado.', v_tipo.nome using errcode = 'check_violation';
  end if;

  if v_tipo.classificacao = 'direta' and new.trabalho_id is null then
    raise exception 'Despesa do tipo "%" (direta) precisa estar ligada a um trabalho.', v_tipo.nome
      using errcode = 'check_violation';
  end if;

  if v_tipo.classificacao = 'indireta' and new.trabalho_id is not null then
    raise exception 'Despesa do tipo "%" (indireta) não pode estar ligada a um trabalho.', v_tipo.nome
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger despesas_validar
  before insert or update on public.despesas
  for each row execute function public.validar_despesa();

-- Mudar a classificação de um tipo já usado deixaria despesas inconsistentes.
create function public.proteger_classificacao_tipo_despesa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.classificacao <> old.classificacao
     and exists (select 1 from public.despesas where tipo_despesa_id = old.id) then
    raise exception 'O tipo "%" já tem despesas lançadas; a classificação não pode mudar. Crie um tipo novo.',
      old.nome using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger tipos_despesa_proteger_classificacao
  before update of classificacao on public.tipos_despesa
  for each row execute function public.proteger_classificacao_tipo_despesa();


-- =============================================================================
-- 10. Gravação do trabalho com o plano de parcelas (uma transação)
-- =============================================================================

-- p_trabalho: {id?, cliente_id, tipo, descricao, data_evento, valor_total, numero_contrato, status?}
-- p_parcelas: [{id?, numero, valor, vencimento}, ...]
-- Valores em texto ("3000.00") para não passar por float.
-- Parcelas fora da lista são apagadas (falha se já tiverem recebimento).
-- O status só é usado na criação; depois muda pela tela (concluir, cancelar).
create function public.salvar_trabalho(p_trabalho jsonb, p_parcelas jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_trabalho ->> 'id', '')::uuid;
begin
  if jsonb_typeof(p_parcelas) is distinct from 'array' then
    raise exception 'O plano de parcelas deve ser uma lista.' using errcode = 'invalid_parameter_value';
  end if;

  if v_id is null then
    insert into public.trabalhos (cliente_id, tipo, descricao, data_evento, valor_total, numero_contrato, status)
    values (
      (p_trabalho ->> 'cliente_id')::uuid,
      p_trabalho ->> 'tipo',
      p_trabalho ->> 'descricao',
      nullif(p_trabalho ->> 'data_evento', '')::date,
      (p_trabalho ->> 'valor_total')::numeric(12,2),
      nullif(p_trabalho ->> 'numero_contrato', ''),
      coalesce(nullif(p_trabalho ->> 'status', ''), 'orcamento')
    )
    returning id into v_id;
  else
    update public.trabalhos
       set cliente_id      = (p_trabalho ->> 'cliente_id')::uuid,
           tipo            = p_trabalho ->> 'tipo',
           descricao       = p_trabalho ->> 'descricao',
           data_evento     = nullif(p_trabalho ->> 'data_evento', '')::date,
           valor_total     = (p_trabalho ->> 'valor_total')::numeric(12,2),
           numero_contrato = nullif(p_trabalho ->> 'numero_contrato', '')
     where id = v_id;

    if not found then
      raise exception 'Trabalho não encontrado.' using errcode = 'no_data_found';
    end if;
  end if;

  delete from public.parcelas p
   where p.trabalho_id = v_id
     and p.id not in (
       select (x ->> 'id')::uuid
         from jsonb_array_elements(p_parcelas) x
        where nullif(x ->> 'id', '') is not null
     );

  update public.parcelas p
     set numero     = x.numero,
         valor      = x.valor,
         vencimento = x.vencimento
    from jsonb_to_recordset(p_parcelas) as x (id uuid, numero int, valor numeric(12,2), vencimento date)
   where x.id is not null
     and p.id = x.id
     and p.trabalho_id = v_id;

  insert into public.parcelas (trabalho_id, numero, valor, vencimento)
  select v_id, x.numero, x.valor, x.vencimento
    from jsonb_to_recordset(p_parcelas) as x (id uuid, numero int, valor numeric(12,2), vencimento date)
   where x.id is null;

  return v_id;
end;
$$;

revoke execute on function public.salvar_trabalho(jsonb, jsonb) from public, anon;
grant execute on function public.salvar_trabalho(jsonb, jsonb) to authenticated;


-- =============================================================================
-- 11. atualizado_em automático
-- =============================================================================

create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function public.definir_atualizado_em();
create trigger configuracoes_atualizado_em before update on public.configuracoes
  for each row execute function public.definir_atualizado_em();
create trigger clientes_atualizado_em before update on public.clientes
  for each row execute function public.definir_atualizado_em();
create trigger trabalhos_atualizado_em before update on public.trabalhos
  for each row execute function public.definir_atualizado_em();
create trigger parcelas_atualizado_em before update on public.parcelas
  for each row execute function public.definir_atualizado_em();
create trigger recebimentos_atualizado_em before update on public.recebimentos
  for each row execute function public.definir_atualizado_em();
create trigger sequencia_recibos_atualizado_em before update on public.sequencia_recibos
  for each row execute function public.definir_atualizado_em();
create trigger recibos_atualizado_em before update on public.recibos
  for each row execute function public.definir_atualizado_em();
create trigger notas_fiscais_atualizado_em before update on public.notas_fiscais
  for each row execute function public.definir_atualizado_em();
create trigger tipos_despesa_atualizado_em before update on public.tipos_despesa
  for each row execute function public.definir_atualizado_em();
create trigger despesas_atualizado_em before update on public.despesas
  for each row execute function public.definir_atualizado_em();


-- =============================================================================
-- 12. Views
-- security_invoker: a view respeita o RLS de quem consulta.
-- Não entram em totais: notas canceladas/substituídas, recebimentos estornados,
-- despesas canceladas.
-- =============================================================================

-- Status da parcela, calculado:
-- paga (pago >= valor) > vencida (venceu e não está paga, mesmo se parcial) > parcial > em_aberto
create view public.vw_parcelas_status
with (security_invoker = true)
as
select
  p.id,
  p.trabalho_id,
  p.numero,
  count(*) filter (where p.numero > 0) over (partition by p.trabalho_id) as total_parcelas,
  p.valor,
  p.vencimento,
  coalesce(r.valor_pago, 0) as valor_pago,
  greatest(p.valor - coalesce(r.valor_pago, 0), 0) as saldo,
  case
    when coalesce(r.valor_pago, 0) >= p.valor then 'paga'
    when p.vencimento < public.hoje() then 'vencida'
    when coalesce(r.valor_pago, 0) > 0 then 'parcial'
    else 'em_aberto'
  end as status
from public.parcelas p
left join (
  select parcela_id, sum(valor) as valor_pago
    from public.recebimentos
   where status = 'confirmado' and parcela_id is not null
   group by parcela_id
) r on r.parcela_id = p.id;

create view public.vw_conciliacao_trabalho
with (security_invoker = true)
as
select
  t.id as trabalho_id,
  t.cliente_id,
  c.nome as cliente_nome,
  t.descricao,
  t.tipo,
  t.status,
  t.data_evento,
  t.data_conclusao,
  t.valor_total,
  coalesce(rec.total_recebido, 0) as total_recebido,
  t.valor_total - coalesce(rec.total_recebido, 0) as saldo_a_receber,
  (n.id is not null) as tem_nota,
  n.id as nota_id,
  n.numero as nota_numero,
  n.valor_servico as valor_nota,
  (n.id is not null and n.valor_servico <> t.valor_total) as nota_divergente,
  (t.status = 'concluido' and n.id is null) as nota_pendente,
  coalesce(rec.sem_recibo, 0) as recebimentos_sem_recibo,
  coalesce(par.vencidas, 0) as parcelas_vencidas
from public.trabalhos t
join public.clientes c on c.id = t.cliente_id
left join lateral (
  select
    sum(r.valor) as total_recebido,
    count(*) filter (
      where not exists (
        select 1 from public.recibos rb where rb.recebimento_id = r.id and rb.status = 'emitido'
      )
    ) as sem_recibo
  from public.recebimentos r
  where r.trabalho_id = t.id and r.status = 'confirmado'
) rec on true
left join public.notas_fiscais n on n.trabalho_id = t.id and n.status = 'emitida'
left join lateral (
  select count(*) as vencidas
    from public.vw_parcelas_status ps
   where ps.trabalho_id = t.id and ps.status = 'vencida'
) par on true;

-- Resultado = recebido − despesas diretas (despesas lançadas + taxas dos recebimentos).
create view public.vw_resultado_trabalho
with (security_invoker = true)
as
with base as (
  select
    t.id as trabalho_id,
    t.cliente_id,
    c.nome as cliente_nome,
    t.descricao,
    t.tipo,
    t.status,
    t.data_evento,
    t.data_conclusao,
    t.valor_total,
    coalesce(rec.total_recebido, 0) as total_recebido,
    coalesce(rec.taxas, 0) as taxas_recebimento,
    coalesce(d.total, 0) as despesas_lancadas
  from public.trabalhos t
  join public.clientes c on c.id = t.cliente_id
  left join lateral (
    select sum(r.valor) as total_recebido, sum(r.taxa) as taxas
      from public.recebimentos r
     where r.trabalho_id = t.id and r.status = 'confirmado'
  ) rec on true
  left join lateral (
    select sum(de.valor) as total
      from public.despesas de
     where de.trabalho_id = t.id and de.status = 'ativa'
  ) d on true
)
select
  base.*,
  base.despesas_lancadas + base.taxas_recebimento as despesas_diretas,
  base.total_recebido - (base.despesas_lancadas + base.taxas_recebimento) as resultado,
  case
    when base.total_recebido > 0 then
      round((base.total_recebido - (base.despesas_lancadas + base.taxas_recebimento)) * 100 / base.total_recebido, 2)
  end as margem_percentual
from base;

-- Por mês: recebido (data do recebimento), faturado em nota (competência),
-- despesas diretas (inclui taxas) e indiretas.
create view public.vw_consolidado_mensal
with (security_invoker = true)
as
with movimentos as (
  select date_trunc('month', r.data_recebimento::timestamp)::date as mes,
         r.valor as recebido, 0::numeric as faturado, r.taxa as diretas, 0::numeric as indiretas
    from public.recebimentos r
   where r.status = 'confirmado'
  union all
  select date_trunc('month', n.data_competencia::timestamp)::date,
         0, n.valor_servico, 0, 0
    from public.notas_fiscais n
   where n.status = 'emitida'
  union all
  select date_trunc('month', d.data::timestamp)::date,
         0, 0,
         case when td.classificacao = 'direta' then d.valor else 0 end,
         case when td.classificacao = 'indireta' then d.valor else 0 end
    from public.despesas d
    join public.tipos_despesa td on td.id = d.tipo_despesa_id
   where d.status = 'ativa'
)
select
  mes,
  sum(recebido) as recebido,
  sum(faturado) as faturado_em_nota,
  sum(diretas) as despesas_diretas,
  sum(indiretas) as despesas_indiretas,
  sum(recebido) - sum(diretas) - sum(indiretas) as resultado
from movimentos
group by mes;

-- Despesas por tipo e mês (gráfico "despesas por categoria").
-- As taxas dos recebimentos aparecem como a categoria "Taxas de recebimento".
create view public.vw_despesas_por_tipo_mensal
with (security_invoker = true)
as
select
  date_trunc('month', d.data::timestamp)::date as mes,
  td.id as tipo_despesa_id,
  td.nome as tipo_nome,
  td.classificacao,
  sum(d.valor) as total,
  count(*) as quantidade
from public.despesas d
join public.tipos_despesa td on td.id = d.tipo_despesa_id
where d.status = 'ativa'
group by 1, 2, 3, 4
union all
select
  date_trunc('month', r.data_recebimento::timestamp)::date,
  null::uuid,
  'Taxas de recebimento',
  'direta',
  sum(r.taxa),
  count(*)
from public.recebimentos r
where r.status = 'confirmado' and r.taxa > 0
group by 1;

-- Alertas do painel (seção 5 da especificação).
-- Trabalhos cancelados não geram alerta, exceto recibo pendente: dinheiro que
-- entrou precisa de recibo mesmo que o trabalho tenha sido cancelado.
create view public.vw_alertas
with (security_invoker = true)
as
select
  'nota_pendente'::text as tipo,
  t.id as trabalho_id,
  null::uuid as referencia_id,
  'Trabalho concluído sem nota fiscal' as descricao,
  t.descricao as trabalho_descricao,
  t.data_conclusao as data_referencia
from public.trabalhos t
where t.status = 'concluido'
  and not exists (
    select 1 from public.notas_fiscais n where n.trabalho_id = t.id and n.status = 'emitida'
  )

union all

select
  'nota_divergente',
  t.id,
  n.id,
  'Valor da nota ' || n.numero || ' diferente do valor total do trabalho',
  t.descricao,
  n.data_emissao
from public.notas_fiscais n
join public.trabalhos t on t.id = n.trabalho_id
where n.status = 'emitida'
  and n.valor_servico <> t.valor_total
  and t.status <> 'cancelado'

union all

select
  'recibo_pendente',
  t.id,
  r.id,
  'Recebimento sem recibo emitido',
  t.descricao,
  r.data_recebimento
from public.recebimentos r
join public.trabalhos t on t.id = r.trabalho_id
where r.status = 'confirmado'
  and not exists (
    select 1 from public.recibos rb where rb.recebimento_id = r.id and rb.status = 'emitido'
  )

union all

select
  'parcela_vencida',
  t.id,
  ps.id,
  case when ps.numero = 0 then 'Sinal vencido'
       else 'Parcela ' || ps.numero || ' de ' || ps.total_parcelas || ' vencida' end,
  t.descricao,
  ps.vencimento
from public.vw_parcelas_status ps
join public.trabalhos t on t.id = ps.trabalho_id
where ps.status = 'vencida'
  and t.status <> 'cancelado'

union all

select
  'trabalho_prejuizo',
  rt.trabalho_id,
  null::uuid,
  'Despesas diretas maiores que o recebido',
  rt.descricao,
  rt.data_conclusao
from public.vw_resultado_trabalho rt
where rt.status = 'concluido'
  and rt.despesas_diretas > rt.total_recebido;


-- =============================================================================
-- 13. RLS
-- Só quem tem linha em perfis acessa. Sem DELETE nas tabelas financeiras
-- (usar status). (select ...) em volta das funções: avaliadas uma vez por consulta.
-- =============================================================================

alter table public.perfis            enable row level security;
alter table public.configuracoes     enable row level security;
alter table public.clientes          enable row level security;
alter table public.trabalhos         enable row level security;
alter table public.parcelas          enable row level security;
alter table public.recebimentos      enable row level security;
alter table public.sequencia_recibos enable row level security;
alter table public.recibos           enable row level security;
alter table public.notas_fiscais     enable row level security;
alter table public.tipos_despesa     enable row level security;
alter table public.despesas          enable row level security;

-- perfis: cada um vê o seu; o admin vê e gerencia todos.
create policy perfis_select on public.perfis
  for select to authenticated
  using (id = (select auth.uid()) or (select public.eh_admin()));
create policy perfis_insert on public.perfis
  for insert to authenticated
  with check ((select public.eh_admin()));
create policy perfis_update on public.perfis
  for update to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- configuracoes: todos leem; só o admin altera.
create policy configuracoes_select on public.configuracoes
  for select to authenticated
  using ((select public.eh_usuario()));
create policy configuracoes_update on public.configuracoes
  for update to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- sequencia_recibos: leitura para todos; ajuste do número inicial só pelo admin.
create policy sequencia_recibos_select on public.sequencia_recibos
  for select to authenticated
  using ((select public.eh_usuario()));
create policy sequencia_recibos_insert on public.sequencia_recibos
  for insert to authenticated
  with check ((select public.eh_admin()));
create policy sequencia_recibos_update on public.sequencia_recibos
  for update to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- recibos: inserção só por emitir_recibo(); update para anexar PDF ou cancelar.
create policy recibos_select on public.recibos
  for select to authenticated
  using ((select public.eh_usuario()));
create policy recibos_update on public.recibos
  for update to authenticated
  using ((select public.eh_usuario()))
  with check ((select public.eh_usuario()));

-- Demais tabelas: select/insert/update para usuários; delete só onde é permitido.
do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'clientes', 'trabalhos', 'parcelas', 'recebimentos', 'notas_fiscais', 'tipos_despesa', 'despesas'
  ] loop
    execute format(
      'create policy %1$s_select on public.%1$I for select to authenticated using ((select public.eh_usuario()))',
      v_tabela);
    execute format(
      'create policy %1$s_insert on public.%1$I for insert to authenticated with check ((select public.eh_usuario()))',
      v_tabela);
    execute format(
      'create policy %1$s_update on public.%1$I for update to authenticated using ((select public.eh_usuario())) with check ((select public.eh_usuario()))',
      v_tabela);
  end loop;

  -- Cadastros não financeiros: delete permitido; a FK (restrict) impede
  -- apagar cliente com trabalho, parcela com recebimento e tipo com despesa.
  foreach v_tabela in array array['clientes', 'parcelas', 'tipos_despesa'] loop
    execute format(
      'create policy %1$s_delete on public.%1$I for delete to authenticated using ((select public.eh_usuario()))',
      v_tabela);
  end loop;
end;
$$;

-- Defesa extra: o papel anônimo não acessa nada do schema public.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;


-- =============================================================================
-- 14. Storage (buckets privados, acesso por URL assinada)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('notas-fiscais', 'notas-fiscais', false, 10485760,
     array['application/pdf', 'application/xml', 'text/xml']),
  ('recibos', 'recibos', false, 5242880,
     array['application/pdf']),
  ('comprovantes', 'comprovantes', false, 10485760,
     array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  -- Logo do estúdio: só PNG/JPEG, que é o que o gerador de PDF aceita.
  ('estudio', 'estudio', false, 2097152,
     array['image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy arquivos_select on storage.objects
  for select to authenticated
  using (
    bucket_id in ('notas-fiscais', 'recibos', 'comprovantes', 'estudio')
    and (select public.eh_usuario())
  );

create policy arquivos_insert on storage.objects
  for insert to authenticated
  with check (
    (bucket_id in ('notas-fiscais', 'recibos', 'comprovantes') and (select public.eh_usuario()))
    or (bucket_id = 'estudio' and (select public.eh_admin()))
  );

-- update: necessário para regravar o PDF de um recibo (upsert).
create policy arquivos_update on storage.objects
  for update to authenticated
  using (
    (bucket_id in ('notas-fiscais', 'recibos', 'comprovantes') and (select public.eh_usuario()))
    or (bucket_id = 'estudio' and (select public.eh_admin()))
  )
  with check (
    (bucket_id in ('notas-fiscais', 'recibos', 'comprovantes') and (select public.eh_usuario()))
    or (bucket_id = 'estudio' and (select public.eh_admin()))
  );

-- delete: só a troca do logo. Documentos fiscais não se apagam.
create policy arquivos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'estudio' and (select public.eh_admin()));
