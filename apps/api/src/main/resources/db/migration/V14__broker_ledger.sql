create table if not exists broker_ledger_sync_run (
    id uuid primary key,
    broker_type varchar(32) not null,
    status varchar(32) not null,
    markets text not null,
    overseas_exchanges text not null,
    start_date date not null,
    end_date date not null,
    trade_count int not null default 0,
    balance_count int not null default 0,
    profit_count int not null default 0,
    requested_at timestamptz not null default now(),
    started_at timestamptz null,
    completed_at timestamptz null,
    error_message text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_broker_ledger_sync_run_requested_at
    on broker_ledger_sync_run (requested_at desc);

create index if not exists idx_broker_ledger_sync_run_status_completed_at
    on broker_ledger_sync_run (status, completed_at desc);

create table if not exists broker_ledger_trade_entry (
    id uuid primary key,
    sync_run_id uuid not null references broker_ledger_sync_run(id) on delete cascade,
    market varchar(32) not null,
    overseas_exchange varchar(32) null,
    row_kind varchar(32) not null,
    source_api varchar(128) not null,
    symbol varchar(32) null,
    symbol_name text null,
    side varchar(16) null,
    order_status varchar(32) null,
    order_number text null,
    execution_number text null,
    quantity bigint null,
    price numeric(19, 6) null,
    filled_quantity bigint null,
    remaining_quantity bigint null,
    realized_pnl numeric(19, 6) null,
    currency varchar(16) null,
    raw_payload jsonb not null default '{}'::jsonb,
    captured_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_broker_ledger_trade_entry_run
    on broker_ledger_trade_entry (sync_run_id, market, captured_at desc);

create table if not exists broker_ledger_balance_snapshot (
    id uuid primary key,
    sync_run_id uuid not null references broker_ledger_sync_run(id) on delete cascade,
    market varchar(32) not null,
    overseas_exchange varchar(32) null,
    row_kind varchar(32) not null,
    source_api varchar(128) not null,
    symbol varchar(32) null,
    symbol_name text null,
    quantity bigint null,
    average_price numeric(19, 6) null,
    current_price numeric(19, 6) null,
    valuation_amount numeric(19, 6) null,
    unrealized_pnl numeric(19, 6) null,
    realized_pnl numeric(19, 6) null,
    profit_rate numeric(19, 6) null,
    currency varchar(16) null,
    raw_payload jsonb not null default '{}'::jsonb,
    captured_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_broker_ledger_balance_snapshot_run
    on broker_ledger_balance_snapshot (sync_run_id, market, captured_at desc);

create table if not exists broker_ledger_profit_snapshot (
    id uuid primary key,
    sync_run_id uuid not null references broker_ledger_sync_run(id) on delete cascade,
    market varchar(32) not null,
    overseas_exchange varchar(32) null,
    row_kind varchar(32) not null,
    source_api varchar(128) not null,
    symbol varchar(32) null,
    symbol_name text null,
    quantity bigint null,
    buy_amount numeric(19, 6) null,
    sell_amount numeric(19, 6) null,
    fees numeric(19, 6) null,
    taxes numeric(19, 6) null,
    realized_pnl numeric(19, 6) null,
    profit_rate numeric(19, 6) null,
    currency varchar(16) null,
    raw_payload jsonb not null default '{}'::jsonb,
    captured_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_broker_ledger_profit_snapshot_run
    on broker_ledger_profit_snapshot (sync_run_id, market, captured_at desc);
