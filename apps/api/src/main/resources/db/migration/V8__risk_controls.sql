create table if not exists strategy_risk_config (
    strategy_id uuid primary key references strategy(id) on delete cascade,
    mode varchar(32) not null,
    per_symbol_max_notional numeric(19, 6) null,
    strategy_max_exposure numeric(19, 6) null,
    max_open_positions integer null,
    daily_loss_limit numeric(19, 6) null,
    strategy_kill_switch_enabled boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists strategy_risk_event (
    id uuid primary key,
    strategy_id uuid not null references strategy(id) on delete cascade,
    order_request_id uuid null references strategy_order_request(id) on delete set null,
    scope varchar(32) not null,
    event_type varchar(48) not null,
    reason_code varchar(64) not null,
    message text not null,
    payload jsonb not null,
    occurred_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_strategy_risk_event_strategy
    on strategy_risk_event (strategy_id, occurred_at desc);

alter table strategy_order_fill
    add column if not exists realized_pnl numeric(19, 6) not null default 0.000000;
