create table if not exists public.orders (
  id text primary key,
  email text not null,
  plan text not null,
  price text not null,
  status text not null default '待核验',
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
