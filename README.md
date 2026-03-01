# 🌿 Week Menu Planner

Een hormoonondersteunende maaltijdplanner gebouwd voor borstvoeding & hormoonbalans.

## ✨ Features

- **Weekmenu** — plan 7 maaltijden per dag
- **Genereer & Remix** — automatisch nieuw weekmenu genereren
- **Recepten beheren** — eigen recepten toevoegen & bewerken
- **Boodschappenlijst** — gesorteerd op Albert Heijn categorieën
- **Favorieten** — bewaar je favoriete gerechten
- **Voedingswaarden** — kcal, eiwit, koolhydraten, vet
- **Seizoensfilter** — recepten per seizoen
- **Login via Magic Link** — geen wachtwoord nodig
- **Supabase sync** — data opgeslagen in de cloud

## 🚀 Deployment (GitHub Pages)

1. Fork of clone deze repository
1. Ga naar **Settings → Pages**
1. Kies **Source: Deploy from a branch** → `main` → `/ (root)`
1. Je app is live op `https://[jouwgebruikersnaam].github.io/menu-planner/`

## 🗄️ Supabase Setup

1. Maak een Supabase project aan op [supabase.com](https://supabase.com)
1. Maak de tabel `user_data` aan:

```sql
create table user_data (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) unique not null,
  week_recipes jsonb default '[]',
  favorites jsonb default '[]',
  ratings jsonb default '{}',
  extra_recipes jsonb default '[]',
  checked_items jsonb default '[]',
  settings jsonb default '{}',
  updated_at timestamptz default now()
);

-- Row Level Security
alter table user_data enable row level security;

create policy "Users can only access their own data"
  on user_data for all
  using (auth.uid() = user_id);
```

1. Update in `index.html`:

```javascript
const SUPA_URL = 'https://jouw-project.supabase.co';
const SUPA_KEY = 'jouw-publishable-key';
```

1. Zet je GitHub Pages URL in **Supabase → Authentication → URL Configuration → Site URL**

## 🌿 Aanpassen

- Recepten toevoegen: ga naar het **📖 Recepten** tabblad → **+ Nieuw recept**
- Instellingen aanpassen: ⚙️ tabblad
- Extra recepten worden opgeslagen in Supabase

## 🛠️ Tech Stack

- Vanilla HTML/CSS/JS (geen framework nodig)
- [Supabase](https://supabase.com) voor auth + database
- [Google Fonts](https://fonts.google.com) — Playfair Display + DM Sans
- Werkt als PWA op mobiel (Add to Home Screen)
