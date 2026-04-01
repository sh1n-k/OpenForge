create table if not exists strategy_execution_config (
    strategy_id uuid primary key references strategy(id) on delete cascade,
    enabled boolean not null default false,
    mode varchar(32) not null,
    schedule_time time not null,
    timezone varchar(64) not null,
    last_scheduled_date date null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists strategy_execution_run (
    id uuid primary key,
    strategy_id uuid not null references strategy(id) on delete cascade,
    strategy_version_id uuid not null references strategy_version(id),
    trigger_type varchar(32) not null,
    status varchar(32) not null,
    scheduled_date date not null,
    started_at timestamptz not null,
    completed_at timestamptz null,
    symbol_count integer not null,
    signal_count integer not null default 0,
    summary jsonb null,
    error_message text null
);

create index if not exists idx_strategy_execution_run_strategy
    on strategy_execution_run (strategy_id, started_at desc);

create table if not exists strategy_signal_event (
    id uuid primary key,
    run_id uuid not null references strategy_execution_run(id) on delete cascade,
    strategy_id uuid not null references strategy(id) on delete cascade,
    strategy_version_id uuid not null references strategy_version(id),
    symbol varchar(32) not null,
    signal_type varchar(32) not null,
    trading_date date not null,
    payload jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_strategy_signal_event_strategy
    on strategy_signal_event (strategy_id, created_at desc);
