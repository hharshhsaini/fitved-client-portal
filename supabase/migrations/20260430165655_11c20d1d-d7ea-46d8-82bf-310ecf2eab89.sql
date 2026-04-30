-- ============================================
-- ENUMS
-- ============================================
create type public.app_role as enum ('client', 'trainer', 'admin');
create type public.plan_type as enum ('1-month', '3-month', '6-month');
create type public.pause_status as enum ('active', 'completed');
create type public.plan_status as enum ('active', 'paused', 'cancelled');

-- ============================================
-- PROFILES
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  society text,
  time_slot text,
  trainer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ============================================
-- USER ROLES (separate table — never on profiles)
-- ============================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security definer function to avoid RLS recursion
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- ============================================
-- PLANS
-- ============================================
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type plan_type not null,
  start_date date not null,
  next_payment_date date not null,
  amount numeric(10,2) not null,
  payment_method text,
  auto_renew boolean not null default true,
  status plan_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.plans enable row level security;
create index plans_user_id_idx on public.plans(user_id);

-- ============================================
-- PAUSES
-- ============================================
create table public.pauses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  status pause_status not null default 'active',
  created_at timestamptz not null default now()
);
alter table public.pauses enable row level security;
create index pauses_user_id_idx on public.pauses(user_id);

-- ============================================
-- HEALTH REPORTS
-- ============================================
create table public.health_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  report_date date not null,
  file_path text,
  created_at timestamptz not null default now()
);
alter table public.health_reports enable row level security;
create index health_reports_user_id_idx on public.health_reports(user_id);

-- ============================================
-- BILLING HISTORY
-- ============================================
create table public.billing_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_date date not null,
  amount numeric(10,2) not null,
  method text,
  created_at timestamptz not null default now()
);
alter table public.billing_history enable row level security;
create index billing_history_user_id_idx on public.billing_history(user_id);

-- ============================================
-- TASKS (trainer workflow)
-- ============================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  trainer_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  due_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;
create index tasks_client_id_idx on public.tasks(client_id);
create index tasks_trainer_id_idx on public.tasks(trainer_id);

-- ============================================
-- TIMESTAMP TRIGGER
-- ============================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger plans_touch before update on public.plans
  for each row execute function public.touch_updated_at();
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ============================================
-- AUTO-CREATE PROFILE + CLIENT ROLE ON SIGNUP
-- ============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone'
  );
  insert into public.user_roles (user_id, role) values (new.id, 'client');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- RLS POLICIES
-- ============================================

-- profiles
create policy "users view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "admins view all profiles" on public.profiles
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "trainers view their clients profiles" on public.profiles
  for select using (trainer_id = auth.uid());
create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "admins update any profile" on public.profiles
  for update using (public.has_role(auth.uid(), 'admin'));

-- user_roles
create policy "users view own roles" on public.user_roles
  for select using (auth.uid() = user_id);
create policy "admins view all roles" on public.user_roles
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "admins manage roles" on public.user_roles
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- plans
create policy "users view own plans" on public.plans
  for select using (auth.uid() = user_id);
create policy "admins view all plans" on public.plans
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "users update own plans" on public.plans
  for update using (auth.uid() = user_id);
create policy "admins manage plans" on public.plans
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- pauses
create policy "users view own pauses" on public.pauses
  for select using (auth.uid() = user_id);
create policy "admins view all pauses" on public.pauses
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "users insert own pauses" on public.pauses
  for insert with check (auth.uid() = user_id);
create policy "users update own pauses" on public.pauses
  for update using (auth.uid() = user_id);
create policy "admins manage pauses" on public.pauses
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- health_reports
create policy "users view own reports" on public.health_reports
  for select using (auth.uid() = user_id);
create policy "admins manage reports" on public.health_reports
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- billing_history
create policy "users view own billing" on public.billing_history
  for select using (auth.uid() = user_id);
create policy "admins manage billing" on public.billing_history
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- tasks
create policy "clients view own tasks" on public.tasks
  for select using (auth.uid() = client_id);
create policy "trainers view their tasks" on public.tasks
  for select using (auth.uid() = trainer_id);
create policy "admins view all tasks" on public.tasks
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "trainers create tasks" on public.tasks
  for insert with check (auth.uid() = trainer_id);
create policy "trainers update own tasks" on public.tasks
  for update using (auth.uid() = trainer_id);
create policy "clients update completion" on public.tasks
  for update using (auth.uid() = client_id);
create policy "admins manage tasks" on public.tasks
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- STORAGE BUCKET FOR HEALTH REPORTS
-- ============================================
insert into storage.buckets (id, name, public)
values ('health-reports', 'health-reports', false)
on conflict (id) do nothing;

create policy "users read own report files" on storage.objects
  for select using (
    bucket_id = 'health-reports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "admins manage report files" on storage.objects
  for all using (
    bucket_id = 'health-reports' and public.has_role(auth.uid(), 'admin')
  ) with check (
    bucket_id = 'health-reports' and public.has_role(auth.uid(), 'admin')
  );