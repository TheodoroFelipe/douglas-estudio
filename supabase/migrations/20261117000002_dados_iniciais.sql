-- =============================================================================
-- Dados iniciais: configuração do estúdio e tipos de despesa sugeridos.
-- Tudo editável depois pelas telas de Configurações e Tipos de despesa.
-- =============================================================================

insert into public.configuracoes (id) values (true)
on conflict (id) do nothing;

-- "Taxa de cartão" não entra: a taxa da maquininha é lançada no próprio
-- recebimento (campo taxa) e já conta como despesa direta nas views.
insert into public.tipos_despesa (nome, classificacao) values
  ('Segundo fotógrafo / assistente', 'direta'),
  ('Impressão e álbum',              'direta'),
  ('Deslocamento e combustível',     'direta'),
  ('Alimentação no evento',          'direta'),
  ('Edição terceirizada',            'direta'),
  ('Aluguel',                        'indireta'),
  ('Energia e internet',             'indireta'),
  ('Equipamento e manutenção',       'indireta'),
  ('Software e assinaturas',         'indireta'),
  ('Marketing',                      'indireta'),
  ('Imposto (DAS) e contador',       'indireta')
on conflict do nothing;
