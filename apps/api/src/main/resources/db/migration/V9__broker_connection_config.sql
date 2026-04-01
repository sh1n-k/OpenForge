create table if not exists broker_connection_config (
    id uuid primary key,
    broker_type varchar(32) not null,
    target_mode varchar(32) not null,
    app_key_ciphertext text,
    app_secret_ciphertext text,
    account_number_ciphertext text,
    product_code_ciphertext text,
    base_url text not null,
    enabled boolean not null default false,
    last_connection_test_at timestamptz null,
    last_connection_test_status varchar(32) null,
    last_connection_test_message text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_broker_connection_config unique (broker_type, target_mode)
);

create table if not exists broker_connection_event (
    id uuid primary key,
    target_mode varchar(32) not null,
    event_type varchar(64) not null,
    message text not null,
    payload jsonb not null default '{}'::jsonb,
    occurred_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_broker_connection_event_occurred_at
    on broker_connection_event (occurred_at desc);
