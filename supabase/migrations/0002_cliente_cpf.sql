-- Cliente pode ser pessoa física (CPF) ou jurídica (CNPJ).
--
-- O documento continua na coluna clientes.cnpj, sem pontuação: 11 dígitos é
-- CPF, 14 posições é CNPJ. Mesma regra de src/lib/validacao/documento.ts.

create or replace function public.cpf_valido(p text)
returns boolean
language plpgsql
immutable
as $$
declare
  v text := coalesce(p, '');
  soma int;
  resto int;
  dv1 int;
  dv2 int;
  i int;
begin
  if v !~ '^[0-9]{11}$' then
    return false;
  end if;
  if v ~ '^(.)\1{10}$' then
    return false;
  end if;

  soma := 0;
  for i in 1..9 loop
    soma := soma + substr(v, i, 1)::int * (11 - i);
  end loop;
  resto := (soma * 10) % 11;
  dv1 := case when resto = 10 then 0 else resto end;

  soma := 0;
  for i in 1..10 loop
    soma := soma + substr(v, i, 1)::int * (12 - i);
  end loop;
  resto := (soma * 10) % 11;
  dv2 := case when resto = 10 then 0 else resto end;

  return dv1 = substr(v, 10, 1)::int and dv2 = substr(v, 11, 1)::int;
end;
$$;

create or replace function public.documento_valido(p text)
returns boolean
language sql
immutable
as $$
  select case length(coalesce(p, ''))
    when 11 then public.cpf_valido(p)
    else public.cnpj_valido(p)
  end;
$$;

-- O nome da restrição continua com "cnpj": src/lib/erros.ts a reconhece por ele.
alter table public.clientes drop constraint clientes_cnpj_check;
alter table public.clientes add constraint clientes_cnpj_check check (public.documento_valido(cnpj));

revoke execute on function public.cpf_valido(text), public.documento_valido(text) from public, anon;
grant execute on function public.cpf_valido(text), public.documento_valido(text) to authenticated;
