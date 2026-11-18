-- =============================================================================
-- Fase 3: recebimentos e recibos
-- =============================================================================
-- 1. Recebimento não passa do saldo da parcela nem do valor contratado
--    (pagamento a mais: ajustar o valor do trabalho antes).
-- 2. O valor total do trabalho não fica abaixo do já recebido.
-- 3. Recibo: cancelamento exige motivo; o PDF é gravado uma vez só, no caminho
--    {ano}/{numero}.pdf, e o bucket não aceita sobrescrever.
-- 4. emitir_recibo exige endereço do cliente e os dados do estúdio.
-- 5. View vw_recebimentos para as listas (com parcela e recibo emitido).


-- -----------------------------------------------------------------------------
-- 1. Limites do recebimento
-- -----------------------------------------------------------------------------

-- Roda depois de recebimentos_validar (ordem alfabética), que já garantiu que
-- a parcela é do trabalho. A trava no trabalho serializa lançamentos
-- simultâneos do mesmo trabalho, para dois não passarem juntos do limite.
create function public.validar_limite_recebimento()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_total_trabalho numeric(12,2);
  v_recebido       numeric(12,2);
  v_valor_parcela  numeric(12,2);
  v_pago_parcela   numeric(12,2);
begin
  if new.status <> 'confirmado' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and (new.trabalho_id, new.parcela_id, new.valor, new.status)
         is not distinct from (old.trabalho_id, old.parcela_id, old.valor, old.status) then
    return new;
  end if;

  select valor_total into v_total_trabalho
    from public.trabalhos
   where id = new.trabalho_id
     for update;

  if new.parcela_id is not null then
    select p.valor, coalesce(sum(r.valor), 0)
      into v_valor_parcela, v_pago_parcela
      from public.parcelas p
      left join public.recebimentos r
        on r.parcela_id = p.id and r.status = 'confirmado' and r.id <> new.id
     where p.id = new.parcela_id
     group by p.valor;

    if v_pago_parcela + new.valor > v_valor_parcela then
      if v_pago_parcela >= v_valor_parcela then
        raise exception 'Esta parcela já está paga.' using errcode = 'check_violation';
      end if;
      raise exception 'O saldo desta parcela é %; o recebimento não pode passar disso.',
        v_valor_parcela - v_pago_parcela
        using errcode = 'check_violation';
    end if;
  end if;

  select coalesce(sum(valor), 0) into v_recebido
    from public.recebimentos
   where trabalho_id = new.trabalho_id and status = 'confirmado' and id <> new.id;

  if v_recebido + new.valor > v_total_trabalho then
    if v_recebido >= v_total_trabalho then
      raise exception 'Este trabalho já foi todo recebido. Se o cliente pagou a mais, aumente antes o valor do trabalho.'
        using errcode = 'check_violation';
    end if;
    raise exception 'Faltam % para fechar o valor do trabalho. Se o cliente pagou a mais, aumente antes o valor do trabalho.',
      v_total_trabalho - v_recebido
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger recebimentos_validar_limite
  before insert or update on public.recebimentos
  for each row execute function public.validar_limite_recebimento();


-- -----------------------------------------------------------------------------
-- 2. Valor do trabalho não fica abaixo do já recebido
-- -----------------------------------------------------------------------------

create function public.validar_valor_trabalho()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_recebido numeric(12,2);
begin
  if new.valor_total < old.valor_total then
    select coalesce(sum(valor), 0) into v_recebido
      from public.recebimentos
     where trabalho_id = new.id and status = 'confirmado';

    if new.valor_total < v_recebido then
      raise exception 'Este trabalho já tem % recebido; o valor total não pode ficar menor que isso.',
        v_recebido
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger trabalhos_validar_valor
  before update of valor_total on public.trabalhos
  for each row execute function public.validar_valor_trabalho();


-- -----------------------------------------------------------------------------
-- 3. Recibo: motivo do cancelamento e PDF gravado uma vez só
-- -----------------------------------------------------------------------------

-- Caminho do PDF no bucket "recibos": 2026/0001.pdf (o front usa o mesmo formato).
create function public.caminho_pdf_recibo(p_ano int, p_numero int)
returns text
language sql
immutable
set search_path = ''
as $$
  select p_ano || '/' || case when p_numero < 10000 then lpad(p_numero::text, 4, '0') else p_numero::text end || '.pdf';
$$;

create or replace function public.proteger_recibo()
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

  if old.status = 'cancelado' then
    if new.status <> 'cancelado' then
      raise exception 'Recibo cancelado não pode voltar a ser emitido. Emita um novo recibo.'
        using errcode = 'check_violation';
    end if;
    if new.motivo_cancelamento is distinct from old.motivo_cancelamento then
      raise exception 'O motivo do cancelamento não pode ser alterado.' using errcode = 'check_violation';
    end if;
  elsif new.status = 'cancelado' then
    if coalesce(btrim(new.motivo_cancelamento), '') = '' then
      raise exception 'Informe o motivo do cancelamento do recibo.' using errcode = 'check_violation';
    end if;
  elsif new.motivo_cancelamento is not null then
    raise exception 'Só recibo cancelado tem motivo de cancelamento.' using errcode = 'check_violation';
  end if;

  -- O PDF arquivado é o documento entregue ao cliente: não muda depois.
  if old.arquivo_pdf is not null and new.arquivo_pdf is distinct from old.arquivo_pdf then
    raise exception 'O PDF deste recibo já foi arquivado e não pode ser trocado.'
      using errcode = 'check_violation';
  end if;
  if old.arquivo_pdf is null and new.arquivo_pdf is not null
     and new.arquivo_pdf <> public.caminho_pdf_recibo(new.ano, new.numero) then
    raise exception 'O PDF do recibo %/% deve ficar em %.',
      new.ano, lpad(new.numero::text, 4, '0'), public.caminho_pdf_recibo(new.ano, new.numero)
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- Storage: no bucket "recibos" só entra o PDF de um recibo que ainda não tem
-- PDF, no caminho dele; e nada é sobrescrito (sem policy de update).
drop policy arquivos_insert on storage.objects;
create policy arquivos_insert on storage.objects
  for insert to authenticated
  with check (
    (bucket_id in ('notas-fiscais', 'comprovantes') and (select public.eh_usuario()))
    or (
      bucket_id = 'recibos'
      and (select public.eh_usuario())
      and exists (
        select 1 from public.recibos r
         where r.arquivo_pdf is null
           and public.caminho_pdf_recibo(r.ano, r.numero) = name
      )
    )
    or (bucket_id = 'estudio' and (select public.eh_admin()))
  );

drop policy arquivos_update on storage.objects;
create policy arquivos_update on storage.objects
  for update to authenticated
  using (
    (bucket_id in ('notas-fiscais', 'comprovantes') and (select public.eh_usuario()))
    or (bucket_id = 'estudio' and (select public.eh_admin()))
  )
  with check (
    (bucket_id in ('notas-fiscais', 'comprovantes') and (select public.eh_usuario()))
    or (bucket_id = 'estudio' and (select public.eh_admin()))
  );


-- -----------------------------------------------------------------------------
-- 4. emitir_recibo: dados obrigatórios do recibo
-- -----------------------------------------------------------------------------

create or replace function public.emitir_recibo(p_recebimento_id uuid)
returns public.recibos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recebimento public.recebimentos;
  v_cliente     public.clientes;
  v_config      public.configuracoes;
  v_faltando    text[] := '{}';
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

  select c.* into v_cliente
    from public.trabalhos t
    join public.clientes c on c.id = t.cliente_id
   where t.id = v_recebimento.trabalho_id;

  if v_cliente.cpf_cnpj is null then
    raise exception 'Cadastre o CPF/CNPJ do cliente antes de emitir o recibo.'
      using errcode = 'check_violation';
  end if;
  if coalesce(btrim(v_cliente.endereco), '') = '' then
    raise exception 'Cadastre o endereço do cliente antes de emitir o recibo.'
      using errcode = 'check_violation';
  end if;

  select * into v_config from public.configuracoes;
  if coalesce(btrim(v_config.razao_social), '') = '' then v_faltando := v_faltando || 'razão social'::text; end if;
  if v_config.cnpj is null then v_faltando := v_faltando || 'CNPJ'::text; end if;
  if coalesce(btrim(v_config.endereco), '') = '' then v_faltando := v_faltando || 'endereço'::text; end if;
  if coalesce(btrim(v_config.responsavel_assinatura), '') = '' then v_faltando := v_faltando || 'responsável pela assinatura'::text; end if;
  if v_config.logo_path is null then v_faltando := v_faltando || 'logo'::text; end if;
  if cardinality(v_faltando) > 0 then
    raise exception 'Faltam dados do estúdio em Configurações: %.', array_to_string(v_faltando, ', ')
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


-- -----------------------------------------------------------------------------
-- 5. Lista de recebimentos
-- -----------------------------------------------------------------------------

create view public.vw_recebimentos
with (security_invoker = true)
as
select
  r.id,
  r.trabalho_id,
  r.parcela_id,
  r.data_recebimento,
  r.valor,
  r.forma_pagamento,
  r.taxa,
  r.status,
  r.observacoes,
  r.criado_em,
  t.descricao as trabalho_descricao,
  t.status as trabalho_status,
  t.cliente_id,
  c.nome as cliente_nome,
  p.numero as parcela_numero,
  (select count(*)::int from public.parcelas p2
    where p2.trabalho_id = r.trabalho_id and p2.numero > 0) as total_parcelas,
  rb.id as recibo_id,
  rb.ano as recibo_ano,
  rb.numero as recibo_numero,
  rb.arquivo_pdf as recibo_pdf
from public.recebimentos r
join public.trabalhos t on t.id = r.trabalho_id
join public.clientes c on c.id = t.cliente_id
left join public.parcelas p on p.id = r.parcela_id
left join public.recibos rb on rb.recebimento_id = r.id and rb.status = 'emitido';

revoke all on public.vw_recebimentos from anon;
