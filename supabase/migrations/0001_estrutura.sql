-- =============================================================================
-- CredMais — estrutura inicial
--
-- Princípio: a carteira é um livro-caixa. O saldo é SEMPRE derivado da soma das
-- movimentações (entradas - saídas). Nenhuma tabela financeira aceita escrita
-- direta do app: empréstimos, parcelas, movimentações, comprovantes e eventos
-- só mudam através das funções deste arquivo, que rodam numa transação só.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Utilitários
-- -----------------------------------------------------------------------------

-- "Hoje" do negócio é o dia em Brasília, não o dia UTC do servidor.
create or replace function public.hoje_br()
returns date
language sql
stable
as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Aceita o CNPJ numérico tradicional e o alfanumérico (Receita, jul/2026):
-- 12 posições [0-9A-Z] + 2 dígitos verificadores. O valor de cada caractere é
-- o código ASCII menos 48, o que mantém os números iguais ao cálculo antigo.
create or replace function public.cnpj_valido(p text)
returns boolean
language plpgsql
immutable
as $$
declare
  v text := upper(coalesce(p, ''));
  pesos1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2];
  pesos2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
  soma int;
  resto int;
  dv1 int;
  dv2 int;
  i int;
begin
  if v !~ '^[0-9A-Z]{12}[0-9]{2}$' then
    return false;
  end if;
  if v ~ '^(.)\1{13}$' then
    return false;
  end if;

  soma := 0;
  for i in 1..12 loop
    soma := soma + (ascii(substr(v, i, 1)) - 48) * pesos1[i];
  end loop;
  resto := soma % 11;
  dv1 := case when resto < 2 then 0 else 11 - resto end;

  soma := 0;
  for i in 1..13 loop
    soma := soma + (ascii(substr(v, i, 1)) - 48) * pesos2[i];
  end loop;
  resto := soma % 11;
  dv2 := case when resto < 2 then 0 else 11 - resto end;

  return dv1 = (ascii(substr(v, 13, 1)) - 48) and dv2 = (ascii(substr(v, 14, 1)) - 48);
end;
$$;

-- -----------------------------------------------------------------------------
-- Usuários
-- -----------------------------------------------------------------------------

create table public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null default '',
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger perfis_updated_at before update on public.perfis
  for each row execute function public.tocar_updated_at();

create or replace function public.criar_perfil_do_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_perfil_do_usuario();

-- Usuários que já existiam antes desta migration.
insert into public.perfis (id, nome, email)
select id, split_part(email, '@', 1), email from auth.users
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Cadastros
-- -----------------------------------------------------------------------------

create table public.clientes (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null check (length(trim(nome)) between 1 and 160),
  cnpj           text not null unique check (public.cnpj_valido(cnpj)),
  contato        text not null default '' check (length(contato) <= 160),
  observacoes    text not null default '' check (length(observacoes) <= 2000),
  status         text not null default 'ATIVO' check (status in ('ATIVO', 'INATIVO')),
  data_cadastro  date not null default public.hoje_br(),
  created_by     uuid references public.perfis (id) default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index clientes_nome_idx on public.clientes (lower(nome));

create trigger clientes_updated_at before update on public.clientes
  for each row execute function public.tocar_updated_at();

create table public.socios (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (length(trim(nome)) between 1 and 160),
  telefone    text not null default '' check (length(telefone) <= 40),
  chave_pix   text not null default '' check (length(chave_pix) <= 140),
  status      text not null default 'ATIVO' check (status in ('ATIVO', 'INATIVO')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger socios_updated_at before update on public.socios
  for each row execute function public.tocar_updated_at();

-- -----------------------------------------------------------------------------
-- Regras (linha única) e histórico
-- -----------------------------------------------------------------------------

create table public.configuracoes (
  id                     int primary key default 1 check (id = 1),
  limiar_diario          numeric(6,2) not null default 35 check (limiar_diario >= 0 and limiar_diario <= 1000),
  limiar_semanal         numeric(6,2) not null default 40 check (limiar_semanal >= 0 and limiar_semanal <= 1000),
  limiar_mensal          numeric(6,2) not null default 50 check (limiar_mensal >= 0 and limiar_mensal <= 1000),
  nome_sistema           text not null default 'CredMais' check (length(trim(nome_sistema)) between 1 and 60),
  razao_social           text not null default '' check (length(razao_social) <= 160),
  cnpj_negocio           text not null default '' check (length(cnpj_negocio) <= 20),
  telefone_negocio       text not null default '' check (length(telefone_negocio) <= 40),
  email_negocio          text not null default '' check (length(email_negocio) <= 160),
  endereco_negocio       text not null default '' check (length(endereco_negocio) <= 300),
  itens_por_pagina       int not null default 20 check (itens_por_pagina in (10, 20, 50, 100)),
  notificar_vencimentos  boolean not null default true,
  notificar_atrasos      boolean not null default true,
  updated_at             timestamptz not null default now(),
  updated_by             uuid references public.perfis (id)
);

insert into public.configuracoes (id) values (1) on conflict (id) do nothing;

create trigger configuracoes_updated_at before update on public.configuracoes
  for each row execute function public.tocar_updated_at();

create table public.historico_regras (
  id              uuid primary key default gen_random_uuid(),
  tipo_regra      text not null check (tipo_regra in ('DIARIO', 'SEMANAL', 'MENSAL')),
  valor_anterior  numeric(6,2) not null,
  valor_novo      numeric(6,2) not null,
  usuario_id      uuid references public.perfis (id),
  created_at      timestamptz not null default now()
);

create index historico_regras_data_idx on public.historico_regras (created_at desc);

-- -----------------------------------------------------------------------------
-- Empréstimos e parcelas
-- -----------------------------------------------------------------------------

create table public.emprestimos (
  id                        uuid primary key default gen_random_uuid(),
  codigo                    bigint generated always as identity unique,
  cliente_id                uuid not null references public.clientes (id),
  valor_principal           numeric(14,2) not null check (valor_principal > 0),
  modalidade                text not null check (modalidade in ('DIARIO', 'SEMANAL', 'MENSAL')),
  -- Cópia do limiar vigente na criação. Nunca é recalculado.
  percentual_limiar         numeric(6,2) not null check (percentual_limiar >= 0),
  valor_juros               numeric(14,2) not null check (valor_juros >= 0),
  valor_total               numeric(14,2) not null,
  quantidade_parcelas       int not null check (quantidade_parcelas > 0),
  valor_parcela_base        numeric(14,2) not null check (valor_parcela_base > 0),
  data_emprestimo           date not null,
  data_primeiro_vencimento  date not null,
  status                    text not null default 'ATIVO' check (status in ('ATIVO', 'FINALIZADO')),
  observacoes               text not null default '' check (length(observacoes) <= 2000),
  usuario_id                uuid references public.perfis (id),
  finalizado_em             timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  check (valor_total = valor_principal + valor_juros),
  check (data_primeiro_vencimento > data_emprestimo)
);

create index emprestimos_cliente_idx on public.emprestimos (cliente_id);
create index emprestimos_status_idx on public.emprestimos (status);

create trigger emprestimos_updated_at before update on public.emprestimos
  for each row execute function public.tocar_updated_at();

create table public.parcelas (
  id                      uuid primary key default gen_random_uuid(),
  emprestimo_id           uuid not null references public.emprestimos (id),
  numero_parcela          int not null check (numero_parcela > 0),
  valor                   numeric(14,2) not null check (valor > 0),
  data_vencimento         date not null,
  status                  text not null default 'PENDENTE' check (status in ('PENDENTE', 'PAGO', 'EM_ATRASO')),
  data_pagamento          timestamptz,
  comprovante_id          uuid,
  usuario_confirmacao_id  uuid references public.perfis (id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (emprestimo_id, numero_parcela),
  check ((status = 'PAGO') = (data_pagamento is not null))
);

create index parcelas_vencimento_idx on public.parcelas (data_vencimento) where status <> 'PAGO';
create index parcelas_emprestimo_idx on public.parcelas (emprestimo_id, numero_parcela);

create trigger parcelas_updated_at before update on public.parcelas
  for each row execute function public.tocar_updated_at();

create table public.comprovantes (
  id              uuid primary key default gen_random_uuid(),
  arquivo         text not null unique,
  nome_original   text not null,
  tipo            text not null,
  tamanho         bigint not null check (tamanho > 0 and tamanho <= 5242880),
  parcela_id      uuid not null references public.parcelas (id),
  uploaded_by     uuid references public.perfis (id),
  created_at      timestamptz not null default now()
);

create index comprovantes_parcela_idx on public.comprovantes (parcela_id);

alter table public.parcelas
  add constraint parcelas_comprovante_fk foreign key (comprovante_id) references public.comprovantes (id);

-- -----------------------------------------------------------------------------
-- Livro-caixa
-- -----------------------------------------------------------------------------

create table public.movimentacoes (
  id               uuid primary key default gen_random_uuid(),
  codigo           bigint generated always as identity unique,
  tipo             text not null check (tipo in ('ENTRADA', 'SAIDA')),
  categoria        text not null check (categoria in ('ADICAO_DE_VALOR', 'RECEBIMENTO_DE_PARCELA', 'EMPRESTIMO', 'ACERTO')),
  valor            numeric(14,2) not null check (valor > 0),
  data_referencia  date not null default public.hoje_br(),
  cliente_id       uuid references public.clientes (id),
  emprestimo_id    uuid references public.emprestimos (id),
  parcela_id       uuid references public.parcelas (id),
  descricao        text not null default '',
  usuario_id       uuid not null references public.perfis (id),
  created_at       timestamptz not null default now(),
  check (
    (categoria in ('ADICAO_DE_VALOR', 'RECEBIMENTO_DE_PARCELA') and tipo = 'ENTRADA') or
    (categoria in ('EMPRESTIMO', 'ACERTO') and tipo = 'SAIDA')
  ),
  check (categoria <> 'RECEBIMENTO_DE_PARCELA' or parcela_id is not null),
  check (categoria <> 'EMPRESTIMO' or emprestimo_id is not null),
  check (categoria <> 'ACERTO' or cliente_id is not null)
);

-- A trava final contra recebimento em dobro: uma parcela, uma entrada.
create unique index movimentacoes_um_recebimento_por_parcela
  on public.movimentacoes (parcela_id) where categoria = 'RECEBIMENTO_DE_PARCELA';
create unique index movimentacoes_uma_saida_por_emprestimo
  on public.movimentacoes (emprestimo_id) where categoria = 'EMPRESTIMO';

create index movimentacoes_data_idx on public.movimentacoes (created_at desc);
create index movimentacoes_cliente_idx on public.movimentacoes (cliente_id);

-- Livro-caixa não se edita nem se apaga: correção é um novo lançamento.
create or replace function public.bloquear_alteracao_movimentacao()
returns trigger
language plpgsql
as $$
begin
  raise exception 'MOVIMENTACAO_IMUTAVEL';
end;
$$;

create trigger movimentacoes_imutaveis before update or delete on public.movimentacoes
  for each row execute function public.bloquear_alteracao_movimentacao();

-- -----------------------------------------------------------------------------
-- Timeline
-- -----------------------------------------------------------------------------

create table public.eventos (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid references public.clientes (id),
  tipo_evento     text not null check (tipo_evento in (
                    'CLIENTE_CRIADO', 'CLIENTE_ATUALIZADO', 'CLIENTE_DESATIVADO', 'CLIENTE_REATIVADO',
                    'EMPRESTIMO_CRIADO', 'PARCELA_PAGA', 'COMPROVANTE_ANEXADO', 'PARCELA_EM_ATRASO',
                    'EMPRESTIMO_FINALIZADO', 'ACERTO_REALIZADO', 'VALOR_ADICIONADO')),
  titulo          text not null,
  descricao       text not null default '',
  valor           numeric(14,2),
  emprestimo_id   uuid references public.emprestimos (id),
  parcela_id      uuid references public.parcelas (id),
  comprovante_id  uuid references public.comprovantes (id),
  movimentacao_id uuid references public.movimentacoes (id),
  usuario_id      uuid references public.perfis (id),
  created_at      timestamptz not null default now()
);

create index eventos_cliente_idx on public.eventos (cliente_id, created_at desc);
-- O aviso de atraso de uma parcela só entra uma vez na timeline.
create unique index eventos_um_atraso_por_parcela
  on public.eventos (parcela_id) where tipo_evento = 'PARCELA_EM_ATRASO';

-- Cadastro e mudança de status do cliente geram evento sozinhos, na mesma
-- transação do insert/update.
create or replace function public.eventos_do_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into eventos (cliente_id, tipo_evento, titulo, descricao, usuario_id)
    values (new.id, 'CLIENTE_CRIADO', 'Cliente cadastrado', new.nome, auth.uid());
  elsif new.status <> old.status then
    insert into eventos (cliente_id, tipo_evento, titulo, usuario_id)
    values (
      new.id,
      case when new.status = 'INATIVO' then 'CLIENTE_DESATIVADO' else 'CLIENTE_REATIVADO' end,
      case when new.status = 'INATIVO' then 'Cliente desativado' else 'Cliente reativado' end,
      auth.uid()
    );
  elsif (new.nome, new.cnpj, new.contato, new.observacoes) is distinct from
        (old.nome, old.cnpj, old.contato, old.observacoes) then
    insert into eventos (cliente_id, tipo_evento, titulo, descricao, usuario_id)
    values (new.id, 'CLIENTE_ATUALIZADO', 'Cadastro atualizado', 'Dados do cliente foram editados.', auth.uid());
  end if;
  return new;
end;
$$;

create trigger clientes_eventos after insert or update on public.clientes
  for each row execute function public.eventos_do_cliente();

-- -----------------------------------------------------------------------------
-- Visões de leitura (respeitam o RLS de quem consulta)
-- -----------------------------------------------------------------------------

-- Status efetivo: uma parcela pendente com vencimento passado já é atraso,
-- mesmo que a rotina de atrasos ainda não tenha rodado hoje.
create view public.vw_parcelas with (security_invoker = true) as
select
  p.*,
  case
    when p.status = 'PENDENTE' and p.data_vencimento < public.hoje_br() then 'EM_ATRASO'
    else p.status
  end as status_efetivo,
  case
    when p.status <> 'PAGO' and p.data_vencimento < public.hoje_br()
      then public.hoje_br() - p.data_vencimento
    else 0
  end as dias_atraso,
  e.cliente_id,
  e.quantidade_parcelas,
  e.modalidade,
  e.codigo as emprestimo_codigo,
  e.status as emprestimo_status,
  c.nome as cliente_nome
from public.parcelas p
join public.emprestimos e on e.id = p.emprestimo_id
join public.clientes c on c.id = e.cliente_id;

create view public.vw_emprestimos with (security_invoker = true) as
select
  e.*,
  c.nome as cliente_nome,
  c.cnpj as cliente_cnpj,
  coalesce(r.total_pago, 0)          as total_pago,
  e.valor_total - coalesce(r.total_pago, 0) as total_pendente,
  coalesce(r.parcelas_pagas, 0)      as parcelas_pagas,
  coalesce(r.parcelas_atrasadas, 0)  as parcelas_atrasadas,
  r.proximo_vencimento,
  r.proximo_valor,
  r.proxima_numero,
  case
    when e.status = 'FINALIZADO' then 'FINALIZADO'
    when coalesce(r.parcelas_atrasadas, 0) > 0 then 'EM_ATRASO'
    else 'ATIVO'
  end as situacao
from public.emprestimos e
join public.clientes c on c.id = e.cliente_id
left join lateral (
  select
    sum(p.valor) filter (where p.status = 'PAGO') as total_pago,
    count(*) filter (where p.status = 'PAGO') as parcelas_pagas,
    count(*) filter (where p.status <> 'PAGO' and p.data_vencimento < public.hoje_br()) as parcelas_atrasadas,
    (array_agg(p.data_vencimento order by p.numero_parcela) filter (where p.status <> 'PAGO'))[1] as proximo_vencimento,
    (array_agg(p.valor order by p.numero_parcela) filter (where p.status <> 'PAGO'))[1] as proximo_valor,
    (array_agg(p.numero_parcela order by p.numero_parcela) filter (where p.status <> 'PAGO'))[1] as proxima_numero
  from public.parcelas p
  where p.emprestimo_id = e.id
) r on true;

create view public.vw_clientes with (security_invoker = true) as
select
  c.*,
  coalesce(r.emprestimos_ativos, 0)  as emprestimos_ativos,
  coalesce(r.emprestimos_total, 0)   as emprestimos_total,
  coalesce(r.valor_ativo, 0)         as valor_ativo,
  coalesce(r.saldo_pendente, 0)      as saldo_pendente,
  coalesce(r.parcelas_atrasadas, 0)  as parcelas_atrasadas,
  r.proximo_vencimento,
  r.proximo_valor,
  case
    when coalesce(r.emprestimos_total, 0) = 0 then 'SEM_EMPRESTIMO'
    when coalesce(r.parcelas_atrasadas, 0) > 0 then 'EM_ATRASO'
    when coalesce(r.emprestimos_ativos, 0) > 0 then 'ATIVO'
    else 'FINALIZADO'
  end as situacao
from public.clientes c
left join lateral (
  select
    count(distinct e.id) filter (where e.status = 'ATIVO') as emprestimos_ativos,
    count(distinct e.id) as emprestimos_total,
    (select coalesce(sum(e2.valor_principal), 0) from public.emprestimos e2
      where e2.cliente_id = c.id and e2.status = 'ATIVO') as valor_ativo,
    sum(p.valor) filter (where p.status <> 'PAGO' and e.status = 'ATIVO') as saldo_pendente,
    count(p.id) filter (where p.status <> 'PAGO' and p.data_vencimento < public.hoje_br()) as parcelas_atrasadas,
    min(p.data_vencimento) filter (where p.status <> 'PAGO') as proximo_vencimento,
    (array_agg(p.valor order by p.data_vencimento, p.numero_parcela) filter (where p.status <> 'PAGO'))[1] as proximo_valor
  from public.emprestimos e
  left join public.parcelas p on p.emprestimo_id = e.id
  where e.cliente_id = c.id
) r on true;

create view public.vw_movimentacoes with (security_invoker = true) as
select
  m.*,
  c.nome as cliente_nome,
  e.codigo as emprestimo_codigo,
  p.numero_parcela,
  e.quantidade_parcelas,
  u.nome as usuario_nome
from public.movimentacoes m
left join public.clientes c on c.id = m.cliente_id
left join public.emprestimos e on e.id = m.emprestimo_id
left join public.parcelas p on p.id = m.parcela_id
left join public.perfis u on u.id = m.usuario_id;

create view public.vw_eventos with (security_invoker = true) as
select
  ev.*,
  u.nome as usuario_nome,
  e.modalidade,
  e.percentual_limiar,
  e.quantidade_parcelas,
  e.codigo as emprestimo_codigo,
  p.numero_parcela,
  p.data_vencimento,
  p.status as parcela_status
from public.eventos ev
left join public.perfis u on u.id = ev.usuario_id
left join public.emprestimos e on e.id = ev.emprestimo_id
left join public.parcelas p on p.id = ev.parcela_id;

create view public.vw_historico_regras with (security_invoker = true) as
select h.*, u.nome as usuario_nome
from public.historico_regras h
left join public.perfis u on u.id = h.usuario_id;

-- -----------------------------------------------------------------------------
-- Carteira
-- -----------------------------------------------------------------------------

create or replace function public.saldo_carteira()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(case when tipo = 'ENTRADA' then valor else -valor end), 0)::numeric(14,2)
  from movimentacoes
$$;

-- Todas as operações que tiram dinheiro da carteira passam por esta trava.
-- Duas saídas simultâneas não conseguem, juntas, gastar mais do que o saldo.
create or replace function public.travar_carteira()
returns void
language sql
as $$ select pg_advisory_xact_lock(hashtext('credmais.carteira')) $$;

create or replace function public.exigir_usuario()
returns uuid
language plpgsql
stable
as $$
declare
  v uuid := auth.uid();
begin
  if v is null then
    raise exception 'NAO_AUTENTICADO';
  end if;
  return v;
end;
$$;

create or replace function public.validar_valor(p numeric)
returns void
language plpgsql
immutable
as $$
begin
  if p is null or p <= 0 then
    raise exception 'VALOR_INVALIDO';
  end if;
  if p <> round(p, 2) then
    raise exception 'VALOR_INVALIDO';
  end if;
  if p > 100000000 then
    raise exception 'VALOR_MUITO_ALTO';
  end if;
end;
$$;

create or replace function public.adicionar_valor(p_valor numeric, p_data date, p_observacao text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := exigir_usuario();
  v_mov uuid;
  v_desc text := coalesce(nullif(trim(p_observacao), ''), 'Adição de valor');
begin
  perform validar_valor(p_valor);
  if p_data is null or p_data > hoje_br() then
    raise exception 'DATA_INVALIDA';
  end if;

  insert into movimentacoes (tipo, categoria, valor, data_referencia, descricao, usuario_id)
  values ('ENTRADA', 'ADICAO_DE_VALOR', p_valor, p_data, v_desc, v_usuario)
  returning id into v_mov;

  insert into eventos (tipo_evento, titulo, descricao, valor, movimentacao_id, usuario_id)
  values ('VALOR_ADICIONADO', 'Valor adicionado à carteira', v_desc, p_valor, v_mov, v_usuario);

  return v_mov;
end;
$$;

create or replace function public.fazer_acerto(p_cliente uuid, p_valor numeric, p_data date, p_observacao text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := exigir_usuario();
  v_mov uuid;
  v_desc text := coalesce(nullif(trim(p_observacao), ''), 'Acerto');
begin
  perform validar_valor(p_valor);
  if p_data is null or p_data > hoje_br() then
    raise exception 'DATA_INVALIDA';
  end if;
  if not exists (select 1 from clientes where id = p_cliente) then
    raise exception 'CLIENTE_NAO_ENCONTRADO';
  end if;

  perform travar_carteira();

  -- O acerto é só uma saída vinculada ao cliente: não toca em empréstimos
  -- nem em parcelas.
  insert into movimentacoes (tipo, categoria, valor, data_referencia, cliente_id, descricao, usuario_id)
  values ('SAIDA', 'ACERTO', p_valor, p_data, p_cliente, v_desc, v_usuario)
  returning id into v_mov;

  insert into eventos (cliente_id, tipo_evento, titulo, descricao, valor, movimentacao_id, usuario_id)
  values (p_cliente, 'ACERTO_REALIZADO', 'Acerto realizado', v_desc, p_valor, v_mov, v_usuario);

  return v_mov;
end;
$$;

-- -----------------------------------------------------------------------------
-- Cálculo do empréstimo (espelho de src/lib/financeiro/emprestimo.ts)
--
-- O app mostra a prévia com o cálculo em TypeScript; a gravação refaz tudo
-- aqui, a partir do limiar vigente no banco. scripts/testar-sql.mjs confere
-- que os dois lados dão o mesmo resultado.
-- -----------------------------------------------------------------------------

create or replace function public.quantidade_parcelas(p_modalidade text)
returns int
language sql
immutable
as $$
  select case p_modalidade when 'DIARIO' then 24 when 'SEMANAL' then 4 when 'MENSAL' then 1 end
$$;

create or replace function public.calcular_vencimentos(p_modalidade text, p_data date)
returns table (numero int, vencimento date)
language plpgsql
immutable
as $$
declare
  d date := p_data;
  n int := 0;
begin
  if p_modalidade = 'DIARIO' then
    -- Uma por dia a partir do dia seguinte, pulando domingos, até 24.
    while n < 24 loop
      d := d + 1;
      if extract(isodow from d) <> 7 then
        n := n + 1;
        numero := n;
        vencimento := d;
        return next;
      end if;
    end loop;
  elsif p_modalidade = 'SEMANAL' then
    for n in 1..4 loop
      numero := n;
      vencimento := p_data + 7 * n;
      return next;
    end loop;
  elsif p_modalidade = 'MENSAL' then
    numero := 1;
    vencimento := p_data + 30;
    return next;
  else
    raise exception 'MODALIDADE_INVALIDA';
  end if;
end;
$$;

create or replace function public.limiar_vigente(p_modalidade text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case p_modalidade
    when 'DIARIO' then limiar_diario
    when 'SEMANAL' then limiar_semanal
    when 'MENSAL' then limiar_mensal
  end
  from configuracoes where id = 1
$$;

create or replace function public.criar_emprestimo(
  p_cliente uuid,
  p_valor numeric,
  p_modalidade text,
  p_data date,
  p_observacao text,
  p_limiar_esperado numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := exigir_usuario();
  v_cliente clientes%rowtype;
  v_limiar numeric(6,2);
  v_juros numeric(14,2);
  v_total numeric(14,2);
  v_qtd int;
  v_base numeric(14,2);
  v_saldo numeric(14,2);
  v_emp uuid;
  v_mov uuid;
  v_primeiro date;
begin
  perform validar_valor(p_valor);
  -- Abaixo de R$ 10,00 a última de 24 parcelas arredondadas pode zerar.
  if p_valor < 10 then
    raise exception 'VALOR_MINIMO_EMPRESTIMO';
  end if;

  if p_modalidade is null or p_modalidade not in ('DIARIO', 'SEMANAL', 'MENSAL') then
    raise exception 'MODALIDADE_INVALIDA';
  end if;
  if p_data is null or p_data > hoje_br() then
    raise exception 'DATA_INVALIDA';
  end if;

  select * into v_cliente from clientes where id = p_cliente;
  if not found then
    raise exception 'CLIENTE_NAO_ENCONTRADO';
  end if;
  if v_cliente.status <> 'ATIVO' then
    raise exception 'CLIENTE_INATIVO';
  end if;

  v_limiar := limiar_vigente(p_modalidade);
  -- A prévia foi feita com outro limiar (alguém mudou a regra no meio):
  -- melhor recusar do que gravar números que a pessoa não viu.
  if p_limiar_esperado is not null and p_limiar_esperado <> v_limiar then
    raise exception 'LIMIAR_ALTERADO';
  end if;

  v_juros := round(p_valor * v_limiar / 100, 2);
  v_total := p_valor + v_juros;
  v_qtd := quantidade_parcelas(p_modalidade);
  v_base := round(v_total / v_qtd, 2);

  perform travar_carteira();

  v_saldo := saldo_carteira();
  if v_saldo < p_valor then
    raise exception 'SALDO_INSUFICIENTE';
  end if;

  select vencimento into v_primeiro from calcular_vencimentos(p_modalidade, p_data) where numero = 1;

  insert into emprestimos (
    cliente_id, valor_principal, modalidade, percentual_limiar, valor_juros, valor_total,
    quantidade_parcelas, valor_parcela_base, data_emprestimo, data_primeiro_vencimento,
    observacoes, usuario_id
  ) values (
    p_cliente, p_valor, p_modalidade, v_limiar, v_juros, v_total,
    v_qtd, v_base, p_data, v_primeiro,
    coalesce(trim(p_observacao), ''), v_usuario
  )
  returning id into v_emp;

  -- A última parcela absorve a sobra do arredondamento, para que a soma
  -- feche exatamente no total.
  insert into parcelas (emprestimo_id, numero_parcela, valor, data_vencimento, status)
  select
    v_emp,
    cv.numero,
    case when cv.numero = v_qtd then v_total - v_base * (v_qtd - 1) else v_base end,
    cv.vencimento,
    'PENDENTE'
  from calcular_vencimentos(p_modalidade, p_data) cv;

  if (select sum(valor) from parcelas where emprestimo_id = v_emp) <> v_total then
    raise exception 'ERRO_ARREDONDAMENTO';
  end if;

  insert into movimentacoes (tipo, categoria, valor, data_referencia, cliente_id, emprestimo_id, descricao, usuario_id)
  values ('SAIDA', 'EMPRESTIMO', p_valor, p_data, p_cliente, v_emp, 'Novo empréstimo', v_usuario)
  returning id into v_mov;

  insert into eventos (cliente_id, tipo_evento, titulo, descricao, valor, emprestimo_id, movimentacao_id, usuario_id)
  values (
    p_cliente, 'EMPRESTIMO_CRIADO', 'Empréstimo criado',
    coalesce(nullif(trim(p_observacao), ''), ''),
    p_valor, v_emp, v_mov, v_usuario
  );

  -- Empréstimo lançado com data retroativa pode já nascer com parcelas
  -- vencidas: marca e registra na timeline agora.
  perform atualizar_atrasos();

  return v_emp;
end;
$$;

-- -----------------------------------------------------------------------------
-- Recebimento de parcela
-- -----------------------------------------------------------------------------

create or replace function public.registrar_pagamento(
  p_parcela uuid,
  p_comprovante_arquivo text default null,
  p_comprovante_nome text default null,
  p_comprovante_tipo text default null,
  p_comprovante_tamanho bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := exigir_usuario();
  v_parcela parcelas%rowtype;
  v_emp emprestimos%rowtype;
  v_proxima parcelas%rowtype;
  v_comprovante uuid;
  v_mov uuid;
  v_finalizado boolean := false;
begin
  -- FOR UPDATE: um segundo clique simultâneo espera este terminar e depois
  -- encontra a parcela já paga.
  select * into v_parcela from parcelas where id = p_parcela for update;
  if not found then
    raise exception 'PARCELA_NAO_ENCONTRADA';
  end if;
  if v_parcela.status = 'PAGO' then
    raise exception 'PARCELA_JA_PAGA';
  end if;

  select * into v_emp from emprestimos where id = v_parcela.emprestimo_id for update;
  if v_emp.status <> 'ATIVO' then
    raise exception 'EMPRESTIMO_FINALIZADO';
  end if;

  if exists (
    select 1 from parcelas
    where emprestimo_id = v_emp.id and status <> 'PAGO' and numero_parcela < v_parcela.numero_parcela
  ) then
    raise exception 'PARCELA_FORA_DE_ORDEM';
  end if;

  if v_parcela.data_vencimento > hoje_br() then
    raise exception 'AGUARDANDO_VENCIMENTO';
  end if;

  if p_comprovante_arquivo is not null then
    insert into comprovantes (arquivo, nome_original, tipo, tamanho, parcela_id, uploaded_by)
    values (p_comprovante_arquivo, coalesce(p_comprovante_nome, 'comprovante'), coalesce(p_comprovante_tipo, ''),
            p_comprovante_tamanho, v_parcela.id, v_usuario)
    returning id into v_comprovante;
  end if;

  update parcelas
     set status = 'PAGO',
         data_pagamento = now(),
         usuario_confirmacao_id = v_usuario,
         comprovante_id = v_comprovante
   where id = v_parcela.id;

  insert into movimentacoes (tipo, categoria, valor, cliente_id, emprestimo_id, parcela_id, descricao, usuario_id)
  values ('ENTRADA', 'RECEBIMENTO_DE_PARCELA', v_parcela.valor, v_emp.cliente_id, v_emp.id, v_parcela.id,
          format('Pagamento parcela %s/%s', v_parcela.numero_parcela, v_emp.quantidade_parcelas), v_usuario)
  returning id into v_mov;

  insert into eventos (cliente_id, tipo_evento, titulo, descricao, valor, emprestimo_id, parcela_id, movimentacao_id, usuario_id)
  values (v_emp.cliente_id, 'PARCELA_PAGA', 'Parcela recebida',
          format('Parcela %s/%s', v_parcela.numero_parcela, v_emp.quantidade_parcelas),
          v_parcela.valor, v_emp.id, v_parcela.id, v_mov, v_usuario);

  if v_comprovante is not null then
    insert into eventos (cliente_id, tipo_evento, titulo, descricao, emprestimo_id, parcela_id, comprovante_id, usuario_id)
    values (v_emp.cliente_id, 'COMPROVANTE_ANEXADO', 'Comprovante anexado',
            format('Comprovante da parcela %s/%s', v_parcela.numero_parcela, v_emp.quantidade_parcelas),
            v_emp.id, v_parcela.id, v_comprovante, v_usuario);
  end if;

  select * into v_proxima from parcelas
   where emprestimo_id = v_emp.id and status <> 'PAGO'
   order by numero_parcela limit 1;

  if not found then
    v_finalizado := true;
    update emprestimos set status = 'FINALIZADO', finalizado_em = now() where id = v_emp.id;
    insert into eventos (cliente_id, tipo_evento, titulo, descricao, valor, emprestimo_id, usuario_id)
    values (v_emp.cliente_id, 'EMPRESTIMO_FINALIZADO', 'Empréstimo finalizado',
            'Todas as parcelas foram pagas.', v_emp.valor_total, v_emp.id, v_usuario);
  end if;

  return jsonb_build_object(
    'finalizado', v_finalizado,
    'proxima_numero', v_proxima.numero_parcela,
    'proxima_vencimento', v_proxima.data_vencimento,
    'proxima_valor', v_proxima.valor
  );
end;
$$;

-- Comprovante enviado depois do recebimento, para parcelas pagas sem anexo.
create or replace function public.anexar_comprovante(
  p_parcela uuid,
  p_arquivo text,
  p_nome text,
  p_tipo text,
  p_tamanho bigint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := exigir_usuario();
  v_parcela parcelas%rowtype;
  v_emp emprestimos%rowtype;
  v_comprovante uuid;
begin
  select * into v_parcela from parcelas where id = p_parcela for update;
  if not found then
    raise exception 'PARCELA_NAO_ENCONTRADA';
  end if;
  if v_parcela.status <> 'PAGO' then
    raise exception 'PARCELA_NAO_PAGA';
  end if;
  if v_parcela.comprovante_id is not null then
    raise exception 'COMPROVANTE_EXISTENTE';
  end if;

  select * into v_emp from emprestimos where id = v_parcela.emprestimo_id;

  insert into comprovantes (arquivo, nome_original, tipo, tamanho, parcela_id, uploaded_by)
  values (p_arquivo, coalesce(p_nome, 'comprovante'), coalesce(p_tipo, ''), p_tamanho, p_parcela, v_usuario)
  returning id into v_comprovante;

  update parcelas set comprovante_id = v_comprovante where id = p_parcela;

  insert into eventos (cliente_id, tipo_evento, titulo, descricao, emprestimo_id, parcela_id, comprovante_id, usuario_id)
  values (v_emp.cliente_id, 'COMPROVANTE_ANEXADO', 'Comprovante anexado',
          format('Comprovante da parcela %s/%s', v_parcela.numero_parcela, v_emp.quantidade_parcelas),
          v_emp.id, p_parcela, v_comprovante, v_usuario);

  return v_comprovante;
end;
$$;

-- -----------------------------------------------------------------------------
-- Atrasos
-- -----------------------------------------------------------------------------

-- Idempotente: pode rodar a cada carregamento de página sem efeito colateral.
create or replace function public.atualizar_atrasos()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qtd int;
begin
  perform exigir_usuario();

  with atrasadas as (
    update parcelas p
       set status = 'EM_ATRASO'
     where p.status = 'PENDENTE'
       and p.data_vencimento < hoje_br()
    returning p.id, p.emprestimo_id, p.numero_parcela, p.valor, p.data_vencimento
  ), inseridos as (
    insert into eventos (cliente_id, tipo_evento, titulo, descricao, valor, emprestimo_id, parcela_id, created_at)
    select e.cliente_id, 'PARCELA_EM_ATRASO', 'Parcela em atraso',
           format('Parcela %s/%s • Vencimento: %s', a.numero_parcela, e.quantidade_parcelas,
                  to_char(a.data_vencimento, 'DD/MM/YYYY')),
           a.valor, e.id, a.id,
           -- O atraso começa no dia seguinte ao vencimento; é nessa hora que
           -- ele aparece na timeline, não na hora em que a rotina rodou.
           greatest((a.data_vencimento + 1)::timestamp at time zone 'America/Sao_Paulo', e.created_at)
    from atrasadas a
    join emprestimos e on e.id = a.emprestimo_id
    on conflict do nothing
    returning 1
  )
  select count(*) into v_qtd from atrasadas;

  return v_qtd;
end;
$$;

-- -----------------------------------------------------------------------------
-- Regras
-- -----------------------------------------------------------------------------

create or replace function public.atualizar_limiares(p_diario numeric, p_semanal numeric, p_mensal numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := exigir_usuario();
  v_atual configuracoes%rowtype;
begin
  if p_diario is null or p_semanal is null or p_mensal is null
     or p_diario < 0 or p_semanal < 0 or p_mensal < 0
     or p_diario > 1000 or p_semanal > 1000 or p_mensal > 1000
     or p_diario <> round(p_diario, 2) or p_semanal <> round(p_semanal, 2) or p_mensal <> round(p_mensal, 2) then
    raise exception 'PERCENTUAL_INVALIDO';
  end if;

  select * into v_atual from configuracoes where id = 1 for update;

  if v_atual.limiar_diario <> p_diario then
    insert into historico_regras (tipo_regra, valor_anterior, valor_novo, usuario_id)
    values ('DIARIO', v_atual.limiar_diario, p_diario, v_usuario);
  end if;
  if v_atual.limiar_semanal <> p_semanal then
    insert into historico_regras (tipo_regra, valor_anterior, valor_novo, usuario_id)
    values ('SEMANAL', v_atual.limiar_semanal, p_semanal, v_usuario);
  end if;
  if v_atual.limiar_mensal <> p_mensal then
    insert into historico_regras (tipo_regra, valor_anterior, valor_novo, usuario_id)
    values ('MENSAL', v_atual.limiar_mensal, p_mensal, v_usuario);
  end if;

  update configuracoes
     set limiar_diario = p_diario,
         limiar_semanal = p_semanal,
         limiar_mensal = p_mensal,
         updated_by = v_usuario
   where id = 1;
end;
$$;

-- -----------------------------------------------------------------------------
-- Leituras agregadas
-- -----------------------------------------------------------------------------

create or replace function public.resumo_painel()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'carteira', saldo_carteira(),
    'total_emprestado', (select coalesce(sum(valor_principal), 0) from emprestimos where status = 'ATIVO'),
    'total_a_receber', (select coalesce(sum(p.valor), 0) from parcelas p
                          join emprestimos e on e.id = p.emprestimo_id
                         where e.status = 'ATIVO' and p.status <> 'PAGO'),
    'recebido_hoje', (select coalesce(sum(valor), 0) from movimentacoes
                       where categoria = 'RECEBIMENTO_DE_PARCELA'
                         and (created_at at time zone 'America/Sao_Paulo')::date = hoje_br()),
    'recebimentos_hoje', (select count(*) from movimentacoes
                           where categoria = 'RECEBIMENTO_DE_PARCELA'
                             and (created_at at time zone 'America/Sao_Paulo')::date = hoje_br()),
    'emprestimos_ativos', (select count(*) from emprestimos where status = 'ATIVO'),
    'parcelas_atrasadas', (select count(*) from parcelas p join emprestimos e on e.id = p.emprestimo_id
                            where e.status = 'ATIVO' and p.status <> 'PAGO' and p.data_vencimento < hoje_br()),
    'vencendo_hoje', (select count(*) from parcelas p join emprestimos e on e.id = p.emprestimo_id
                       where e.status = 'ATIVO' and p.status <> 'PAGO' and p.data_vencimento = hoje_br())
  )
$$;

create or replace function public.resumo_carteira(p_inicio date, p_fim date)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'saldo', saldo_carteira(),
    'total_entradas', (select coalesce(sum(valor), 0) from movimentacoes where tipo = 'ENTRADA'),
    'total_saidas', (select coalesce(sum(valor), 0) from movimentacoes where tipo = 'SAIDA'),
    'entradas_periodo', (select coalesce(sum(valor), 0) from movimentacoes
                          where tipo = 'ENTRADA'
                            and (created_at at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim),
    'saidas_periodo', (select coalesce(sum(valor), 0) from movimentacoes
                        where tipo = 'SAIDA'
                          and (created_at at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim)
  )
$$;

-- Série para o gráfico: um ponto por dia (ou por mês), com zeros nos buracos.
create or replace function public.serie_movimentacoes(p_inicio date, p_fim date, p_agrupar text)
returns table (periodo date, entradas numeric, saidas numeric)
language sql
stable
security invoker
set search_path = public
as $$
  with eixo as (
    select generate_series(
      case when p_agrupar = 'mes' then date_trunc('month', p_inicio)::date else p_inicio end,
      p_fim,
      case when p_agrupar = 'mes' then interval '1 month' else interval '1 day' end
    )::date as periodo
  ),
  movs as (
    select
      case when p_agrupar = 'mes'
        then date_trunc('month', (created_at at time zone 'America/Sao_Paulo'))::date
        else (created_at at time zone 'America/Sao_Paulo')::date
      end as periodo,
      tipo,
      valor
    from movimentacoes
    where (created_at at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim
  )
  select
    eixo.periodo,
    coalesce(sum(m.valor) filter (where m.tipo = 'ENTRADA'), 0) as entradas,
    coalesce(sum(m.valor) filter (where m.tipo = 'SAIDA'), 0) as saidas
  from eixo
  left join movs m on m.periodo = eixo.periodo
  group by eixo.periodo
  order by eixo.periodo
$$;

-- -----------------------------------------------------------------------------
-- Permissões
--
-- O Supabase concede tudo a anon/authenticated por padrão. Aqui tiramos e
-- devolvemos só o necessário: leitura para quem está logado, escrita direta
-- apenas nos cadastros, e o resto só pelas funções acima.
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'perfis', 'clientes', 'socios', 'configuracoes', 'historico_regras', 'emprestimos',
    'parcelas', 'comprovantes', 'movimentacoes', 'eventos'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format(
      'create policy "leitura para usuarios logados" on public.%I for select to authenticated using (true)', t);
  end loop;
end;
$$;

revoke all on public.vw_parcelas, public.vw_emprestimos, public.vw_clientes, public.vw_movimentacoes,
              public.vw_eventos, public.vw_historico_regras from anon, authenticated;
grant select on public.vw_parcelas, public.vw_emprestimos, public.vw_clientes, public.vw_movimentacoes,
               public.vw_eventos, public.vw_historico_regras to authenticated;

-- Cadastros: escrita direta só nas colunas editáveis.
grant insert (nome, cnpj, contato, observacoes) on public.clientes to authenticated;
grant update (nome, cnpj, contato, observacoes, status) on public.clientes to authenticated;
create policy "cadastro de clientes" on public.clientes for insert to authenticated with check (true);
create policy "edicao de clientes" on public.clientes for update to authenticated using (true) with check (true);

grant insert (nome, telefone, chave_pix) on public.socios to authenticated;
grant update (nome, telefone, chave_pix, status) on public.socios to authenticated;
create policy "cadastro de socios" on public.socios for insert to authenticated with check (true);
create policy "edicao de socios" on public.socios for update to authenticated using (true) with check (true);

-- Limiares ficam de fora: só mudam por atualizar_limiares, que grava histórico.
grant update (nome_sistema, razao_social, cnpj_negocio, telefone_negocio, email_negocio, endereco_negocio,
              itens_por_pagina, notificar_vencimentos, notificar_atrasos, updated_by)
  on public.configuracoes to authenticated;
create policy "edicao de configuracoes" on public.configuracoes for update to authenticated using (true) with check (true);

grant update (nome) on public.perfis to authenticated;
create policy "cada um edita o proprio perfil" on public.perfis for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Funções: nada para anônimos.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.hoje_br(), public.cnpj_valido(text), public.saldo_carteira(),
  public.adicionar_valor(numeric, date, text),
  public.fazer_acerto(uuid, numeric, date, text),
  public.criar_emprestimo(uuid, numeric, text, date, text, numeric),
  public.registrar_pagamento(uuid, text, text, text, bigint),
  public.anexar_comprovante(uuid, text, text, text, bigint),
  public.atualizar_atrasos(),
  public.atualizar_limiares(numeric, numeric, numeric),
  public.resumo_painel(), public.resumo_carteira(date, date),
  public.serie_movimentacoes(date, date, text),
  public.calcular_vencimentos(text, date), public.quantidade_parcelas(text), public.limiar_vigente(text)
to authenticated;

-- -----------------------------------------------------------------------------
-- Storage: comprovantes (privado)
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "comprovantes: envio" on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes');

create policy "comprovantes: leitura" on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes');

-- Só para limpar um upload cujo recebimento falhou: arquivo já vinculado a
-- uma parcela não pode ser apagado.
create policy "comprovantes: limpeza de envio sem vinculo" on storage.objects for delete to authenticated
  using (
    bucket_id = 'comprovantes'
    and owner = auth.uid()
    and not exists (select 1 from public.comprovantes c where c.arquivo = storage.objects.name)
  );
