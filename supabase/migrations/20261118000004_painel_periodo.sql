-- =============================================================================
-- Fase 5: painel por período
-- =============================================================================
-- painel_periodo(início, fim): uma linha por mês do período (meses vazios com
-- zero), com o que entrou, o que foi faturado, as despesas e o que estava
-- previsto nas parcelas. total_vencido(): o que já venceu e não foi pago, hoje.
--
-- Mesmas regras das views: não entram recebimentos estornados, notas
-- canceladas/substituídas, despesas canceladas nem parcelas de trabalho
-- cancelado. As taxas dos recebimentos contam como despesa direta.

create function public.painel_periodo(p_inicio date, p_fim date)
returns table (
  mes                date,
  recebido           numeric,
  taxas              numeric,
  faturado           numeric,
  despesas_diretas   numeric,
  despesas_indiretas numeric,
  resultado          numeric,
  previsto           numeric,
  a_receber          numeric
)
language plpgsql
stable
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_inicio date := date_trunc('month', p_inicio)::date;
  v_fim    date := (date_trunc('month', p_fim) + interval '1 month')::date;  -- exclusivo
begin
  if p_inicio is null or p_fim is null or p_fim < p_inicio then
    raise exception 'Período inválido: o fim vem antes do início.' using errcode = 'invalid_parameter_value';
  end if;
  if v_fim > (v_inicio + interval '10 years')::date then
    raise exception 'Período longo demais (máximo de 10 anos).' using errcode = 'invalid_parameter_value';
  end if;

  return query
  with meses as (
    select generate_series(v_inicio, v_fim - 1, interval '1 month')::date as mes
  ),
  rec as (
    select date_trunc('month', r.data_recebimento)::date as mes, sum(r.valor) as recebido, sum(r.taxa) as taxas
      from public.recebimentos r
     where r.status = 'confirmado' and r.data_recebimento >= v_inicio and r.data_recebimento < v_fim
     group by 1
  ),
  nf as (
    select date_trunc('month', n.data_competencia)::date as mes, sum(n.valor_servico) as faturado
      from public.notas_fiscais n
     where n.status = 'emitida' and n.data_competencia >= v_inicio and n.data_competencia < v_fim
     group by 1
  ),
  desp as (
    select date_trunc('month', d.data)::date as mes,
           sum(d.valor) filter (where td.classificacao = 'direta') as diretas,
           sum(d.valor) filter (where td.classificacao = 'indireta') as indiretas
      from public.despesas d
      join public.tipos_despesa td on td.id = d.tipo_despesa_id
     where d.status = 'ativa' and d.data >= v_inicio and d.data < v_fim
     group by 1
  ),
  par as (
    select date_trunc('month', ps.vencimento)::date as mes, sum(ps.valor) as previsto, sum(ps.saldo) as a_receber
      from public.vw_parcelas_status ps
      join public.trabalhos t on t.id = ps.trabalho_id
     where t.status <> 'cancelado' and ps.vencimento >= v_inicio and ps.vencimento < v_fim
     group by 1
  )
  select
    m.mes,
    coalesce(rec.recebido, 0),
    coalesce(rec.taxas, 0),
    coalesce(nf.faturado, 0),
    coalesce(rec.taxas, 0) + coalesce(desp.diretas, 0),
    coalesce(desp.indiretas, 0),
    coalesce(rec.recebido, 0) - coalesce(rec.taxas, 0) - coalesce(desp.diretas, 0) - coalesce(desp.indiretas, 0),
    coalesce(par.previsto, 0),
    coalesce(par.a_receber, 0)
  from meses m
  left join rec on rec.mes = m.mes
  left join nf on nf.mes = m.mes
  left join desp on desp.mes = m.mes
  left join par on par.mes = m.mes
  order by m.mes;
end;
$$;

create function public.total_vencido()
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(ps.saldo), 0)
    from public.vw_parcelas_status ps
    join public.trabalhos t on t.id = ps.trabalho_id
   where ps.status = 'vencida' and t.status <> 'cancelado';
$$;

revoke execute on function public.painel_periodo(date, date) from public, anon;
revoke execute on function public.total_vencido() from public, anon;
grant execute on function public.painel_periodo(date, date) to authenticated;
grant execute on function public.total_vencido() to authenticated;
