-- =============================================================================
-- Calendário de eventos: horário e local do evento (opcionais)
-- =============================================================================
-- Horário sem data não faz sentido; o local é texto livre curto.

alter table public.trabalhos
  add column hora_evento  time,
  add column local_evento text check (local_evento is null or (btrim(local_evento) <> '' and length(local_evento) <= 200)),
  add constraint trabalhos_hora_exige_data check (hora_evento is null or data_evento is not null);

comment on column public.trabalhos.hora_evento is 'Horário do evento (opcional), sem fuso: é a hora local do evento.';
comment on column public.trabalhos.local_evento is 'Onde acontece o evento (opcional), ex.: "Rafain Palace".';

create index trabalhos_data_evento_idx on public.trabalhos (data_evento);

-- salvar_trabalho passa a gravar horário e local.
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
    insert into public.trabalhos (cliente_id, tipo, descricao, data_evento, hora_evento, local_evento,
                                  valor_total, numero_contrato, status)
    values (
      (p_trabalho ->> 'cliente_id')::uuid,
      p_trabalho ->> 'tipo',
      p_trabalho ->> 'descricao',
      nullif(p_trabalho ->> 'data_evento', '')::date,
      nullif(p_trabalho ->> 'hora_evento', '')::time,
      nullif(btrim(p_trabalho ->> 'local_evento'), ''),
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
           hora_evento     = nullif(p_trabalho ->> 'hora_evento', '')::time,
           local_evento    = nullif(btrim(p_trabalho ->> 'local_evento'), ''),
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
