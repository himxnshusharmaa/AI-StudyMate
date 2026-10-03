create table documents (id uuid primary key default gen_random_uuid(), user_id uuid not null, name text, text text, created_at timestamptz default now());
create table generations (id uuid primary key default gen_random_uuid(), doc_id uuid references documents on delete cascade, user_id uuid not null, kind text, content jsonb, created_at timestamptz default now());
create table attempts (id uuid primary key default gen_random_uuid(), doc_id uuid references documents on delete cascade, user_id uuid not null, score int, total int, weak_topics jsonb, created_at timestamptz default now());
-- The backend uses the service key, so lock tables from direct browser access:
alter table documents enable row level security; alter table generations enable row level security; alter table attempts enable row level security;
