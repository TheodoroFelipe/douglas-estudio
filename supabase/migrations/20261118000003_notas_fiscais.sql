-- =============================================================================
-- Fase 4: notas fiscais (NFS-e final do trabalho, emitida no Emissor Nacional)
-- =============================================================================
-- 1. Nota nova só em trabalho concluído (a NFS-e sai na conclusão).
-- 2. Chave de acesso conferida: dígito verificador, número da nota e CNPJ do
--    estúdio (a chave nacional traz os dois). Data de emissão não pode ser futura.
-- 3. Cancelar exige motivo; nota cancelada ou substituída fica toda travada.
-- 4. Arquivos em {id da nota}/nota.pdf e nota.xml; no Storage só entram (e só
--    são trocados) arquivos de nota emitida, nesses caminhos.
--
-- Chave de acesso da NFS-e nacional (50 dígitos):
--   município (7) + ambiente gerador (1) + tipo de inscrição (1) + CNPJ/CPF (14)
--   + número da NFS-e (13) + ano/mês de emissão AAMM (4) + código numérico (9)
--   + dígito verificador (1, módulo 11, pesos 2 a 9 da direita para a esquerda).


-- -----------------------------------------------------------------------------
-- 1. Dígito verificador da chave
-- -----------------------------------------------------------------------------

create function public.chave_nfse_valida(p_chave text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_soma  int := 0;
  v_peso  int := 2;
  v_resto int;
begin
  if p_chave is null or p_chave !~ '^[0-9]{50}$' then
    return false;
  end if;
  for i in reverse 49..1 loop
    v_soma := v_soma + substr(p_chave, i, 1)::int * v_peso;
    v_peso := case when v_peso = 9 then 2 else v_peso + 1 end;
  end loop;
  v_resto := v_soma % 11;
  return substr(p_chave, 50, 1)::int = case when v_resto < 2 then 0 else 11 - v_resto end;
end;
$$;


-- -----------------------------------------------------------------------------
-- 2. Regras da nota
-- -----------------------------------------------------------------------------

create or replace function public.validar_nota_fiscal()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_substituida     public.notas_fiscais;
  v_status_trabalho text;
  v_cnpj_estudio    text;
begin
  -- Cancelada ou substituída: nada muda, nem status, motivo ou arquivos.
  if tg_op = 'UPDATE' and old.status <> 'emitida' then
    if (new.status, new.trabalho_id, new.numero, new.chave_acesso, new.data_emissao, new.data_competencia,
        new.valor_servico, new.aliquota_iss, new.codigo_servico, new.descricao_servico,
        new.nota_substituida_id, new.motivo_cancelamento, new.arquivo_pdf, new.arquivo_xml)
       is distinct from
       (old.status, old.trabalho_id, old.numero, old.chave_acesso, old.data_emissao, old.data_competencia,
        old.valor_servico, old.aliquota_iss, old.codigo_servico, old.descricao_servico,
        old.nota_substituida_id, old.motivo_cancelamento, old.arquivo_pdf, old.arquivo_xml) then
      raise exception 'Nota cancelada ou substituída não pode ser alterada.' using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'emitida' then
      raise exception 'Nota nova entra como emitida.' using errcode = 'check_violation';
    end if;

    -- Padrões das configurações (código 13.03.01, descrição, alíquota).
    new.codigo_servico := coalesce(
      new.codigo_servico, (select codigo_servico_padrao from public.configuracoes), '13.03.01');
    new.descricao_servico := coalesce(
      new.descricao_servico, (select descricao_servico_padrao from public.configuracoes));
    new.aliquota_iss := coalesce(
      new.aliquota_iss, (select aliquota_iss_padrao from public.configuracoes));
  end if;

  if tg_op = 'INSERT' or new.trabalho_id <> old.trabalho_id then
    select status into v_status_trabalho from public.trabalhos where id = new.trabalho_id;
    if v_status_trabalho is distinct from 'concluido' then
      raise exception 'Conclua o trabalho antes de registrar a nota fiscal.' using errcode = 'check_violation';
    end if;
  end if;

  -- Chave, número e CNPJ (só quando mudam: cancelar não depende das
  -- configurações de hoje).
  if tg_op = 'INSERT' or (new.numero, new.chave_acesso) is distinct from (old.numero, old.chave_acesso) then
    new.numero := btrim(new.numero);
    if new.numero !~ '^[0-9]+$' then
      raise exception 'O número da nota deve ter só dígitos.' using errcode = 'check_violation';
    end if;
    if not public.chave_nfse_valida(new.chave_acesso) then
      raise exception 'Chave de acesso inválida: confira os 50 dígitos.' using errcode = 'check_violation';
    end if;
    if new.numero::numeric <> substr(new.chave_acesso, 24, 13)::numeric then
      raise exception 'O número da nota (%) não confere com a chave de acesso (nota %).',
        new.numero, substr(new.chave_acesso, 24, 13)::numeric
        using errcode = 'check_violation';
    end if;
    select cnpj into v_cnpj_estudio from public.configuracoes;
    if v_cnpj_estudio is not null and substr(new.chave_acesso, 10, 14) <> v_cnpj_estudio then
      raise exception 'A chave de acesso é de uma nota de outro CNPJ, não do estúdio.' using errcode = 'check_violation';
    end if;
  end if;

  if (tg_op = 'INSERT' or new.data_emissao <> old.data_emissao) and new.data_emissao > public.hoje() then
    raise exception 'A data de emissão não pode ser futura.' using errcode = 'check_violation';
  end if;

  -- Motivo só no cancelamento, e obrigatório nele.
  if new.status = 'cancelada' then
    if coalesce(btrim(new.motivo_cancelamento), '') = '' then
      raise exception 'Informe o motivo do cancelamento da nota.' using errcode = 'check_violation';
    end if;
  elsif new.motivo_cancelamento is not null then
    raise exception 'Só nota cancelada tem motivo de cancelamento.' using errcode = 'check_violation';
  end if;

  -- Arquivos no caminho da própria nota.
  if new.arquivo_pdf is not null and new.arquivo_pdf <> new.id || '/nota.pdf' then
    raise exception 'O PDF da nota deve ficar em %.', new.id || '/nota.pdf' using errcode = 'check_violation';
  end if;
  if new.arquivo_xml is not null and new.arquivo_xml <> new.id || '/nota.xml' then
    raise exception 'O XML da nota deve ficar em %.', new.id || '/nota.xml' using errcode = 'check_violation';
  end if;

  -- Substituição: a nota antiga vira "substituida" antes da nova entrar,
  -- então o índice único de nota ativa continua valendo.
  if tg_op = 'INSERT' and new.nota_substituida_id is not null then
    select * into v_substituida from public.notas_fiscais where id = new.nota_substituida_id for update;
    if v_substituida.trabalho_id is distinct from new.trabalho_id then
      raise exception 'A nota substituída precisa ser do mesmo trabalho.' using errcode = 'check_violation';
    end if;
    if v_substituida.status <> 'emitida' then
      raise exception 'Só uma nota emitida pode ser substituída.' using errcode = 'check_violation';
    end if;
    update public.notas_fiscais set status = 'substituida' where id = new.nota_substituida_id;
  end if;
  if tg_op = 'UPDATE' and new.nota_substituida_id is distinct from old.nota_substituida_id then
    raise exception 'A nota substituída não pode ser trocada depois do registro.' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 3. Storage: arquivos só de nota emitida, no caminho dela
-- -----------------------------------------------------------------------------

create function public.caminho_de_nota_emitida(p_caminho text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.notas_fiscais n
     where n.status = 'emitida'
       and p_caminho in (n.id || '/nota.pdf', n.id || '/nota.xml')
  );
$$;

drop policy arquivos_insert on storage.objects;
create policy arquivos_insert on storage.objects
  for insert to authenticated
  with check (
    (bucket_id = 'comprovantes' and (select public.eh_usuario()))
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

-- Trocar o arquivo de uma nota emitida (upsert) é permitido; de recibo, não.
drop policy arquivos_update on storage.objects;
create policy arquivos_update on storage.objects
  for update to authenticated
  using (
    (bucket_id = 'comprovantes' and (select public.eh_usuario()))
    or (bucket_id = 'notas-fiscais' and (select public.eh_usuario()) and public.caminho_de_nota_emitida(name))
    or (bucket_id = 'estudio' and (select public.eh_admin()))
  )
  with check (
    (bucket_id = 'comprovantes' and (select public.eh_usuario()))
    or (bucket_id = 'notas-fiscais' and (select public.eh_usuario()) and public.caminho_de_nota_emitida(name))
    or (bucket_id = 'estudio' and (select public.eh_admin()))
  );
