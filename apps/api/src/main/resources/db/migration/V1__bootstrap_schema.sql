create table if not exists app_config (
    key text primary key,
    value jsonb not null,
    updated_at timestamptz not null default now()
);

create table if not exists app_event_log (
    id bigserial primary key,
    event_type text not null,
    level text not null,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

