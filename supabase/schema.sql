create extension if not exists pgcrypto;

create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  config_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.backtest_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strategy_id uuid references public.strategies(id) on delete set null,
  symbol text not null,
  timeframe text not null,
  metrics jsonb not null,
  config_json jsonb not null,
  total_return numeric,
  win_rate numeric,
  created_at timestamptz not null default now()
);

create index if not exists strategies_user_updated_idx
  on public.strategies (user_id, updated_at desc);

create index if not exists backtest_results_user_created_idx
  on public.backtest_results (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists strategies_set_updated_at on public.strategies;
create trigger strategies_set_updated_at
before update on public.strategies
for each row
execute function public.set_updated_at();

alter table public.strategies enable row level security;
alter table public.backtest_results enable row level security;

drop policy if exists "Users can read own strategies" on public.strategies;
create policy "Users can read own strategies"
on public.strategies for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own strategies" on public.strategies;
create policy "Users can insert own strategies"
on public.strategies for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own strategies" on public.strategies;
create policy "Users can update own strategies"
on public.strategies for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own strategies" on public.strategies;
create policy "Users can delete own strategies"
on public.strategies for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own backtest results" on public.backtest_results;
create policy "Users can read own backtest results"
on public.backtest_results for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own backtest results" on public.backtest_results;
create policy "Users can insert own backtest results"
on public.backtest_results for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own backtest results" on public.backtest_results;
create policy "Users can delete own backtest results"
on public.backtest_results for delete
using (auth.uid() = user_id);
