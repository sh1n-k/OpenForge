update strategy_order_request
set status = 'REQUESTED'
where status = 'PENDING';

create table if not exists strategy_order_status_event (
    id uuid primary key,
    order_request_id uuid not null references strategy_order_request(id) on delete cascade,
    status varchar(32) not null,
    reason text null,
    payload jsonb not null,
    occurred_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_strategy_order_status_event_order
    on strategy_order_status_event (order_request_id, occurred_at desc);

create table if not exists strategy_order_fill (
    id uuid primary key,
    order_request_id uuid not null references strategy_order_request(id) on delete cascade,
    strategy_id uuid not null references strategy(id) on delete cascade,
    strategy_version_id uuid not null references strategy_version(id),
    symbol varchar(32) not null,
    side varchar(32) not null,
    quantity bigint not null,
    price numeric(19, 6) not null,
    filled_at timestamptz not null,
    source varchar(32) not null,
    payload jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_strategy_order_fill_strategy
    on strategy_order_fill (strategy_id, filled_at desc);

create index if not exists idx_strategy_order_fill_order
    on strategy_order_fill (order_request_id, filled_at asc);
