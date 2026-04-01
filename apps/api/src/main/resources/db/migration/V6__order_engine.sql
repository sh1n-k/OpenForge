create table if not exists strategy_order_request (
    id uuid primary key,
    strategy_id uuid not null references strategy(id) on delete cascade,
    strategy_version_id uuid not null references strategy_version(id),
    signal_event_id uuid not null references strategy_signal_event(id) on delete cascade,
    execution_run_id uuid not null references strategy_execution_run(id) on delete cascade,
    mode varchar(32) not null,
    side varchar(32) not null,
    order_type varchar(32) not null,
    quantity bigint not null,
    price numeric(19, 6) not null,
    status varchar(32) not null,
    precheck_passed boolean not null,
    precheck_summary jsonb not null,
    failure_reason text null,
    requested_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists uq_strategy_order_request_dedup
    on strategy_order_request (strategy_id, signal_event_id, side, mode);

create index if not exists idx_strategy_order_request_strategy
    on strategy_order_request (strategy_id, requested_at desc);
