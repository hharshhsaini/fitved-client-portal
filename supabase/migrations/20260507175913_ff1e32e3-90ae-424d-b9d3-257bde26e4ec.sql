
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  interest text not null,
  source text default 'landing',
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "Anyone can submit a lead"
on public.leads for insert
to anon, authenticated
with check (
  char_length(name) between 1 and 100
  and char_length(phone) between 7 and 20
  and char_length(interest) between 1 and 60
);

create policy "Admins can read leads"
on public.leads for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));
