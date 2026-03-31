create table if not exists strategy (
    id uuid primary key,
    name varchar(120) not null,
    description text null,
    strategy_type varchar(32) not null,
    status varchar(32) not null,
    is_archived boolean not null default false,
    latest_version_id uuid null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists universe (
    id uuid primary key,
    name varchar(120) not null,
    description text null,
    is_archived boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists strategy_version (
    id uuid primary key,
    strategy_id uuid not null references strategy(id),
    version_number integer not null,
    payload_format varchar(32) not null,
    payload jsonb not null,
    change_summary text null,
    created_at timestamptz not null default now()
);

create table if not exists universe_symbol (
    id uuid primary key,
    universe_id uuid not null references universe(id),
    symbol varchar(32) not null,
    market varchar(32) not null,
    display_name varchar(120) not null,
    sort_order integer not null default 0
);

create table if not exists strategy_universe (
    id uuid primary key,
    strategy_id uuid not null references strategy(id),
    universe_id uuid not null references universe(id),
    created_at timestamptz not null default now()
);

alter table strategy
    add constraint fk_strategy_latest_version
    foreign key (latest_version_id) references strategy_version(id);

create unique index if not exists uq_strategy_name_active
    on strategy (lower(name))
    where is_archived = false;

create unique index if not exists uq_universe_name_active
    on universe (lower(name))
    where is_archived = false;

create unique index if not exists uq_strategy_version_number
    on strategy_version (strategy_id, version_number);

create unique index if not exists uq_universe_symbol
    on universe_symbol (universe_id, symbol);

create unique index if not exists uq_strategy_universe
    on strategy_universe (strategy_id, universe_id);

