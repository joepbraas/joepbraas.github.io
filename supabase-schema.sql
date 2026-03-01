– Week Menu Planner — Supabase Schema
– Voer dit uit in de Supabase SQL Editor

– Maak de tabel aan
create table if not exists user_data (
id           uuid default gen_random_uuid() primary key,
user_id      uuid references auth.users(id) unique not null,
week_recipes jsonb default ‘[]’,
favorites    jsonb default ‘[]’,
ratings      jsonb default ‘{}’,
extra_recipes jsonb default ‘[]’,
checked_items jsonb default ‘[]’,
settings     jsonb default ‘{}’,
updated_at   timestamptz default now()
);

– Row Level Security inschakelen
alter table user_data enable row level security;

– Policy: gebruikers mogen alleen hun eigen data zien/aanpassen
create policy “Users own data”
on user_data for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

– Index voor snellere lookups
create index if not exists user_data_user_id_idx on user_data(user_id);

– Auto-update timestamp trigger
create or replace function update_updated_at()
returns trigger as $$
begin
new.updated_at = now();
return new;
end;
$$ language plpgsql;

create trigger user_data_updated_at
before update on user_data
for each row execute procedure update_updated_at();
