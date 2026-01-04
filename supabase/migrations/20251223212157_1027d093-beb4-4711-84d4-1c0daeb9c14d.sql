-- Fix infinite recursion in RLS policies by using a SECURITY DEFINER helper

-- 1) Helper function to check the current user's role without triggering RLS recursion
create or replace function public.has_role(_user_id uuid, _role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = _user_id
      and p.role = _role
  );
$$;

revoke all on function public.has_role(uuid, public.user_role) from public;
grant execute on function public.has_role(uuid, public.user_role) to authenticated;

-- 2) Update PROFILES policy that caused recursion
-- Old policy referenced profiles inside its own policy via a subquery.
drop policy if exists "Hospital users can view all profiles" on public.profiles;
create policy "Hospital users can view all profiles"
on public.profiles
for select
using (public.has_role(auth.uid(), 'hospital'::public.user_role));

-- 3) Update AMBULANCES policy that referenced profiles (also triggers recursion)
drop policy if exists "Hospital users can view all ambulances" on public.ambulances;
create policy "Hospital users can view all ambulances"
on public.ambulances
for select
using (public.has_role(auth.uid(), 'hospital'::public.user_role));
