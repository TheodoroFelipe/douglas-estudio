-- =============================================================================
-- Fase 6: despesas e resultado por trabalho
-- =============================================================================
-- As tabelas, a regra direta/indireta e as views de resultado vieram na
-- Fase 1. Aqui:
-- 1. Nome do tipo de despesa normalizado como o de tipos de trabalho
--    ("Álbum" e "album" são o mesmo tipo), com espaços simples.
-- 2. Despesa: data não futura, cancelamento com motivo e definitivo
--    (cancelada não muda mais), comprovante no caminho da própria despesa.
-- 3. Storage: no bucket "comprovantes" só entra o arquivo de uma despesa
--    ativa, no caminho dela.


-- -----------------------------------------------------------------------------
-- 1. Tipos de despesa
-- -----------------------------------------------------------------------------

drop index public.tipos_despesa_nome_unico;
create unique index tipos_despesa_nome_unico on public.tipos_despesa (public.normalizar_nome(nome));

alter table public.tipos_despesa
  add constraint tipos_despesa_nome_tamanho check (length(nome) <= 60);

create function public.preparar_tipo_despesa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.nome := regexp_replace(btrim(new.nome), '\s+', ' ', 'g');
  return new;
end;
$$;

create trigger tipos_despesa_preparar
  before insert or update of nome on public.tipos_despesa
  for each row execute function public.preparar_tipo_despesa();


-- -----------------------------------------------------------------------------
-- 2. Despesa
-- -----------------------------------------------------------------------------

alter table public.despesas add column motivo_cancelamento text;

-- Caminho do comprovante no bucket: {id da despesa}/comprovante.{pdf|jpg|png|webp}.
create function public.caminho_comprovante_valido(p_despesa_id uuid, p_caminho text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_caminho ~ ('^' || p_despesa_id::text || '/comprovante\.(pdf|jpg|png|webp)$');
$$;

-- Roda antes de despesas_validar (tipo direto/indireto), pela ordem alfabética.
create function public.proteger_despesa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Cancelada: nada muda.
  if tg_op = 'UPDATE' and old.status = 'cancelada' then
    if (new.tipo_despesa_id, new.trabalho_id, new.data, new.valor, new.descricao, new.fornecedor,
        new.comprovante, new.status, new.motivo_cancelamento)
       is distinct from
       (old.tipo_despesa_id, old.trabalho_id, old.data, old.valor, old.descricao, old.fornecedor,
        old.comprovante, old.status, old.motivo_cancelamento) then
      raise exception 'Despesa cancelada não pode ser alterada. Lance uma despesa nova.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' and new.status <> 'ativa' then
    raise exception 'Despesa nova entra como ativa.' using errcode = 'check_violation';
  end if;

  if (tg_op = 'INSERT' or new.data <> old.data) and new.data > public.hoje() then
    raise exception 'A data da despesa não pode ser futura.' using errcode = 'check_violation';
  end if;

  new.descricao := nullif(btrim(new.descricao), '');
  new.fornecedor := nullif(btrim(new.fornecedor), '');

  -- Motivo só no cancelamento, e obrigatório nele.
  if new.status = 'cancelada' then
    if coalesce(btrim(new.motivo_cancelamento), '') = '' then
      raise exception 'Informe o motivo do cancelamento da despesa.' using errcode = 'check_violation';
    end if;
    new.motivo_cancelamento := btrim(new.motivo_cancelamento);
  elsif new.motivo_cancelamento is not null then
    raise exception 'Só despesa cancelada tem motivo de cancelamento.' using errcode = 'check_violation';
  end if;

  if new.comprovante is not null and not public.caminho_comprovante_valido(new.id, new.comprovante) then
    raise exception 'O comprovante deve ficar em %/comprovante.(pdf, jpg, png ou webp).', new.id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger despesas_proteger
  before insert or update on public.despesas
  for each row execute function public.proteger_despesa();


-- -----------------------------------------------------------------------------
-- 3. Storage: comprovante só no caminho de uma despesa ativa
-- -----------------------------------------------------------------------------

create function public.caminho_de_despesa_ativa(p_caminho text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.despesas d
     where d.status = 'ativa'
       and d.id::text = split_part(p_caminho, '/', 1)
       and public.caminho_comprovante_valido(d.id, p_caminho)
  );
$$;

-- Mesmas regras da Fase 4 para notas, recibos e logo; muda só "comprovantes".
drop policy arquivos_insert on storage.objects;
create policy arquivos_insert on storage.objects
  for insert to authenticated
  with check (
    (
      bucket_id = 'comprovantes'
      and (select public.eh_usuario())
      and public.caminho_de_despesa_ativa(name)
    )
    or (
      bucket_id = 'notas-fiscais'
      and (select public.eh_usuario())
      and public.caminho_de_nota_emitida(name)
    )
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

-- Trocar o comprovante de uma despesa ativa (upsert) é permitido.
drop policy arquivos_update on storage.objects;
create policy arquivos_update on storage.objects
  for update to authenticated
  using (
    (bucket_id = 'comprovantes' and (select public.eh_usuario()) and public.caminho_de_despesa_ativa(name))
    or (bucket_id = 'notas-fiscais' and (select public.eh_usuario()) and public.caminho_de_nota_emitida(name))
    or (bucket_id = 'estudio' and (select public.eh_admin()))
  )
  with check (
    (bucket_id = 'comprovantes' and (select public.eh_usuario()) and public.caminho_de_despesa_ativa(name))
    or (bucket_id = 'notas-fiscais' and (select public.eh_usuario()) and public.caminho_de_nota_emitida(name))
    or (bucket_id = 'estudio' and (select public.eh_admin()))
  );
