# CredMais

Sistema de gestão de empréstimos: clientes, empréstimos, parcelas, recebimentos,
carteira (livro-caixa), sócios e regras de juros.

Next.js 16 (App Router) + Supabase (Postgres, Auth e Storage).

## Como a carteira funciona

A carteira é um livro-caixa. O saldo **não é um campo gravado**: é sempre a soma
das entradas menos a soma das saídas da tabela `movimentacoes`.

| Operação | Efeito na carteira | Função no banco |
|---|---|---|
| Adicionar valor | + valor | `adicionar_valor` |
| Empréstimo | − principal | `criar_emprestimo` |
| Recebimento de parcela | + valor da parcela | `registrar_pagamento` |
| Acerto | − valor | `fazer_acerto` |

Cada operação é uma função no Postgres que roda numa transação única: grava o
lançamento, atualiza parcela/empréstimo e registra o evento na timeline, ou não
faz nada. O app não tem permissão de escrita direta nessas tabelas, e as
movimentações são imutáveis (um trigger impede update/delete).

Proteções no banco:

- recebimento duplicado: a parcela é travada (`FOR UPDATE`) e existe um índice
  único de uma entrada por parcela;
- empréstimo maior que o saldo: saídas passam por uma trava da carteira
  (`pg_advisory_xact_lock`), então dois empréstimos simultâneos não gastam
  juntos mais que o saldo;
- o limiar é copiado para o empréstimo na criação e nunca é recalculado.

## Regras de cálculo

`JUROS = VALOR × LIMIAR`, `TOTAL = VALOR + JUROS`, `PARCELA = TOTAL / N`.

| Modalidade | Limiar padrão | Parcelas | Vencimentos |
|---|---|---|---|
| Diário | 35% | 24 | a partir do dia seguinte, pulando domingos |
| Semanal | 40% | 4 | D+7, D+14, D+21, D+28 |
| Mensal | 50% | 1 | D+30 |

Arredondamento em centavos. A diferença vai para a **última** parcela, para que a
soma feche exatamente no total. Empréstimo mínimo: R$ 10,00 (abaixo disso, a
última de 24 parcelas arredondadas poderia ficar zerada ou negativa).

O cálculo existe em dois lugares, de propósito: `src/lib/financeiro/emprestimo.ts`
(prévia na tela) e `criar_emprestimo` no SQL (gravação). `npm run test:sql`
confere que os dois dão o mesmo resultado.

## Estrutura

```
supabase/migrations/   esquema, funções financeiras, RLS, bucket de comprovantes
src/lib/financeiro/    dinheiro (centavos), datas, cálculo do empréstimo
src/lib/validacao/     CPF e CNPJ (numérico e alfanumérico) do cliente
src/lib/servicos/      acesso ao banco, por domínio
src/acoes/             server actions: autenticam, validam e chamam os serviços
src/components/        interface (ui, casca, operações, timeline, gráfico)
src/app/               páginas
scripts/               migrations e testes
```

## Rodando localmente

1. `npm install`
2. Copie `.env.local.example` para `.env.local` e preencha.
3. Aplique a migration: `npm run db:push` (precisa de `SUPABASE_DB_URL`) ou cole
   `supabase/migrations/0001_estrutura.sql` no SQL Editor do Supabase.
4. Crie o usuário em Authentication → Users → Add user.
5. `npm run dev`

## Testes

- `npm test`: regras financeiras, sem banco.
- `npm run test:sql`: o ciclo completo dentro de uma transação desfeita no final.
- `npm run typecheck`, `npm run lint`.
