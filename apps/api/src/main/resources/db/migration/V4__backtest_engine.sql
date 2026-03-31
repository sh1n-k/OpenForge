create table if not exists market_daily_bar (
    symbol varchar(32) not null,
    trading_date date not null,
    open numeric(19, 6) not null,
    high numeric(19, 6) not null,
    low numeric(19, 6) not null,
    close numeric(19, 6) not null,
    volume numeric(19, 0) not null,
    primary key (symbol, trading_date)
);

create table if not exists backtest_run (
    id uuid primary key,
    strategy_id uuid not null references strategy(id),
    strategy_version_id uuid not null references strategy_version(id),
    status varchar(32) not null,
    run_config jsonb not null,
    normalized_spec jsonb not null,
    symbols jsonb not null,
    summary jsonb,
    error_message text,
    requested_at timestamptz not null,
    started_at timestamptz,
    completed_at timestamptz
);

create index if not exists idx_backtest_run_strategy on backtest_run(strategy_id, requested_at desc);
create index if not exists idx_backtest_run_status on backtest_run(status, requested_at asc);

create table if not exists backtest_trade (
    id uuid primary key,
    run_id uuid not null references backtest_run(id) on delete cascade,
    symbol varchar(32) not null,
    entry_date date not null,
    exit_date date not null,
    entry_price numeric(19, 6) not null,
    exit_price numeric(19, 6) not null,
    quantity bigint not null,
    gross_pnl numeric(19, 6) not null,
    net_pnl numeric(19, 6) not null,
    pnl_percent numeric(19, 8) not null,
    exit_reason varchar(32) not null
);

create index if not exists idx_backtest_trade_run on backtest_trade(run_id, entry_date);

create table if not exists backtest_equity_point (
    run_id uuid not null references backtest_run(id) on delete cascade,
    trading_date date not null,
    equity numeric(19, 6) not null,
    cash numeric(19, 6) not null,
    drawdown numeric(19, 8) not null,
    primary key (run_id, trading_date)
);
