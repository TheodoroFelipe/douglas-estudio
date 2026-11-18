-- =============================================================================
-- Fase 2: regras de clientes, trabalhos e parcelas
-- =============================================================================
-- 1. Todo trabalho tem plano de parcelas (à vista = uma parcela só).
-- 2. Com nota emitida, o trabalho não sai de "concluido" nem vira "cancelado"
--    (primeiro cancela a nota).
-- 3. Parcela com dinheiro recebido não fica com valor menor que o já pago.


-- -----------------------------------------------------------------------------
-- 1. Plano de parcelas obrigatório
-- -----------------------------------------------------------------------------

-- Soma das parcelas = valor total, e pelo menos uma parcela.
-- Continua deferida: vale o estado no fim da transação.
create or replace function public.verificar_soma_parcelas()
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

  -- Trabalho que já não existe (não acontece hoje: trabalhos não são apagados).
  if v_total is null then
    return null;
  end if;

  if v_soma is null then
    raise exception 'O trabalho precisa ter pelo menos uma parcela.'
      using errcode = 'check_violation';
  end if;

  if v_soma <> v_total then
    raise exception 'A soma das parcelas (%) é diferente do valor total do trabalho (%).',
      v_soma, v_total
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

-- salvar_trabalho recusa plano vazio logo de cara, com mensagem clara.
create or replace function public.salvar_trabalho(p_trabalho jsonb, p_parcelas jsonb)
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

  if jsonb_array_length(p_parcelas) = 0 then
    raise exception 'O trabalho precisa ter pelo menos uma parcela.' using errcode = 'check_violation';
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


-- -----------------------------------------------------------------------------
-- 2. Status do trabalho x nota emitida
-- -----------------------------------------------------------------------------

create function public.validar_status_trabalho()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and (old.status = 'concluido' or new.status = 'cancelado')
     and exists (
       select 1 from public.notas_fiscais where trabalho_id = new.id and status = 'emitida'
     ) then
    raise exception 'Este trabalho tem nota fiscal emitida. Cancele a nota antes de %.',
      case when new.status = 'cancelado' then 'cancelar o trabalho' else 'reabrir o trabalho' end
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trabalhos_validar_status
  before update of status on public.trabalhos
  for each row execute function public.validar_status_trabalho();


-- -----------------------------------------------------------------------------
-- 3. Parcela não fica abaixo do que já foi pago
-- -----------------------------------------------------------------------------

create function public.validar_valor_parcela()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_pago numeric(12,2);
begin
  select coalesce(sum(valor), 0) into v_pago
    from public.recebimentos
   where parcela_id = new.id and status = 'confirmado';

  if new.valor < v_pago then
    raise exception 'A parcela % já tem % recebido; o valor não pode ficar menor que isso.',
      new.numero, v_pago
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger parcelas_validar_valor
  before update of valor on public.parcelas
  for each row execute function public.validar_valor_parcela();
