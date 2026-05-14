alter table strategy_risk_config
    add column if not exists live_trading_enabled boolean not null default false,
    add column if not exists account_max_order_notional numeric(19, 6) null,
    add column if not exists account_daily_max_order_notional numeric(19, 6) null,
    add column if not exists symbol_max_order_notional numeric(19, 6) null,
    add column if not exists min_order_notional numeric(19, 6) not null default 5000.000000,
    add column if not exists fee_rate numeric(12, 8) not null default 0.00015000,
    add column if not exists tax_rate numeric(12, 8) not null default 0.00180000,
    add column if not exists close_unfilled_policy varchar(32) not null default 'cancel';

create table if not exists strategy_rebalance_plan (
    id uuid primary key,
    strategy_id uuid not null references strategy(id) on delete cascade,
    strategy_version_id uuid not null references strategy_version(id),
    mode varchar(32) not null,
    status varchar(32) not null,
    account_snapshot jsonb not null,
    target_weights jsonb not null,
    settings_snapshot jsonb not null,
    risk_summary jsonb not null,
    approval_required boolean not null default true,
    admin_approved boolean not null default false,
    approved_at timestamptz null,
    approved_by text null,
    failure_reason text null,
    planned_at timestamptz not null,
    sent_at timestamptz null,
    synced_at timestamptz null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_strategy_rebalance_plan_strategy
    on strategy_rebalance_plan (strategy_id, planned_at desc);

create table if not exists strategy_rebalance_plan_order (
    id uuid primary key,
    plan_id uuid not null references strategy_rebalance_plan(id) on delete cascade,
    strategy_id uuid not null references strategy(id) on delete cascade,
    symbol varchar(32) not null,
    side varchar(32) not null,
    quantity bigint not null,
    price numeric(19, 6) not null,
    notional numeric(19, 6) not null,
    estimated_fee numeric(19, 6) not null,
    estimated_tax numeric(19, 6) not null,
    status varchar(32) not null,
    idempotency_key text not null,
    broker_order_number text null,
    broker_response_code text null,
    broker_response_message text null,
    requested_at timestamptz null,
    last_synced_at timestamptz null,
    filled_quantity bigint not null default 0,
    remaining_quantity bigint not null default 0,
    precheck_summary jsonb not null default '{}'::jsonb,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists uq_strategy_rebalance_plan_order_once
    on strategy_rebalance_plan_order (plan_id, symbol, side);

create unique index if not exists uq_strategy_rebalance_plan_order_idempotency
    on strategy_rebalance_plan_order (idempotency_key);

create index if not exists idx_strategy_rebalance_plan_order_open_symbol
    on strategy_rebalance_plan_order (strategy_id, symbol, status);

create table if not exists strategy_trade_audit_log (
    id uuid primary key,
    strategy_id uuid not null references strategy(id) on delete cascade,
    plan_id uuid null references strategy_rebalance_plan(id) on delete set null,
    order_id uuid null references strategy_rebalance_plan_order(id) on delete set null,
    event_type text not null,
    payload jsonb not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_strategy_trade_audit_log_strategy
    on strategy_trade_audit_log (strategy_id, created_at desc);
