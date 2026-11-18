-- =============================================================================
-- Tipos de trabalho cadastráveis
-- =============================================================================
-- Antes: lista fixa (formatura, ensaio, casamento, evento, outro) num check.
-- Agora: tabela tipos_trabalho, mantida pelo dono e pelo admin.
-- trabalhos.tipo continua guardando a chave do tipo (as views não mudam);
-- a chave é gerada a partir do nome e não muda, o nome pode ser trocado.
-- Tipo com trabalhos não se apaga (FK): desativa. Tipo desativado não entra
-- em trabalho novo nem em troca de tipo.


-- -----------------------------------------------------------------------------
-- 1. Nome normalizado (sem acento, minúsculo, espaços simples)
-- -----------------------------------------------------------------------------

create function public.normalizar_nome(p_texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    translate(lower(btrim(p_texto)),
              'áàâãäéèêëíìîïóòôõöúùûüçñ',
              'aaaaaeeeeiiiiooooouuuucn'),
    '\s+', ' ', 'g');
$$;


-- -----------------------------------------------------------------------------
-- 2. Tabela e dados iniciais
-- -----------------------------------------------------------------------------

create table public.tipos_trabalho (
  chave         text primary key default '' check (chave ~ '^[a-z0-9_]+$'),  -- '' = gerar do nome
  nome          text not null check (btrim(nome) <> '' and length(nome) <= 60),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por    uuid default auth.uid() references auth.users (id) on delete set null
);

-- "Ensaio", "ensaio " e "Ensáio" são o mesmo tipo.
create unique index tipos_trabalho_nome_unico on public.tipos_trabalho (public.normalizar_nome(nome));

insert into public.tipos_trabalho (chave, nome) values
  ('formatura', 'Formatura'),
  ('ensaio', 'Ensaio'),
  ('casamento', 'Casamento'),
  ('evento', 'Evento'),
  ('outro', 'Outro');

-- Nome com espaços simples; chave gerada do nome no cadastro e fixa depois.
create function public.preparar_tipo_trabalho()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_base   text;
  v_chave  text;
  v_sufixo int := 1;
begin
  new.nome := regexp_replace(btrim(new.nome), '\s+', ' ', 'g');

  if tg_op = 'UPDATE' then
    if new.chave <> old.chave then
      raise exception 'A chave do tipo de trabalho não pode ser alterada.' using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.chave is null or new.chave = '' then
    v_base := btrim(regexp_replace(public.normalizar_nome(new.nome), '[^a-z0-9]+', '_', 'g'), '_');
    if v_base = '' then
      v_base := 'tipo';
    end if;
    v_chave := v_base;
    while exists (select 1 from public.tipos_trabalho where chave = v_chave) loop
      v_sufixo := v_sufixo + 1;
      v_chave := v_base || '_' || v_sufixo;
    end loop;
    new.chave := v_chave;
  end if;
  return new;
end;
$$;

create trigger tipos_trabalho_preparar
  before insert or update on public.tipos_trabalho
  for each row execute function public.preparar_tipo_trabalho();

create trigger tipos_trabalho_atualizado_em before update on public.tipos_trabalho
  for each row execute function public.definir_atualizado_em();


-- -----------------------------------------------------------------------------
-- 3. Trabalho aponta para o tipo cadastrado
-- -----------------------------------------------------------------------------

alter table public.trabalhos drop constraint trabalhos_tipo_check;
alter table public.trabalhos
  add constraint trabalhos_tipo_fkey foreign key (tipo) references public.tipos_trabalho (chave) on delete restrict;
create index trabalhos_tipo_idx on public.trabalhos (tipo);

-- Tipo desativado não entra em trabalho novo nem em troca de tipo
-- (trabalhos antigos daquele tipo continuam editáveis).
create function public.validar_tipo_trabalho()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_tipo public.tipos_trabalho;
begin
  if tg_op = 'UPDATE' and new.tipo = old.tipo then
    return new;
  end if;
  select * into v_tipo from public.tipos_trabalho where chave = new.tipo;
  if found and not v_tipo.ativo then
    raise exception 'O tipo "%" está desativado. Reative em Tipos de trabalho ou escolha outro.', v_tipo.nome
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trabalhos_validar_tipo
  before insert or update of tipo on public.trabalhos
  for each row execute function public.validar_tipo_trabalho();


-- -----------------------------------------------------------------------------
-- 4. RLS: dono e admin cadastram, renomeiam, desativam e apagam (sem uso)
-- -----------------------------------------------------------------------------

alter table public.tipos_trabalho enable row level security;

create policy tipos_trabalho_select on public.tipos_trabalho
  for select to authenticated using ((select public.eh_usuario()));
create policy tipos_trabalho_insert on public.tipos_trabalho
  for insert to authenticated with check ((select public.eh_usuario()));
create policy tipos_trabalho_update on public.tipos_trabalho
  for update to authenticated using ((select public.eh_usuario())) with check ((select public.eh_usuario()));
create policy tipos_trabalho_delete on public.tipos_trabalho
  for delete to authenticated using ((select public.eh_usuario()));

revoke all on public.tipos_trabalho from anon;
