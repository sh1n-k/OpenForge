alter table universe
    add column if not exists market_scope varchar(16) not null default 'domestic';

alter table symbol_master
    add column if not exists market_scope varchar(16) not null default 'domestic';

alter table symbol_master
    drop constraint if exists symbol_master_pkey;

alter table symbol_master
    add primary key (market_scope, code, exchange);

alter table symbol_master_status
    add column if not exists market_scope varchar(16);

update symbol_master_status
set market_scope = 'domestic'
where market_scope is null;

alter table symbol_master_status
    drop constraint if exists symbol_master_status_pkey;

alter table symbol_master_status
    alter column market_scope set not null;

alter table symbol_master_status
    add primary key (market_scope);

alter table symbol_master_status
    drop column if exists id;

alter table symbol_master_status
    drop column if exists kospi_count;

alter table symbol_master_status
    drop column if exists kosdaq_count;

insert into symbol_master_status (market_scope, collected_at)
values ('domestic', null), ('us', null)
on conflict do nothing;

alter table universe_symbol
    add column if not exists exchange varchar(16);

update universe_symbol us
set exchange = sm.exchange
from symbol_master sm
where us.exchange is null
  and sm.market_scope = us.market
  and sm.code = us.symbol;

update universe_symbol
set exchange = 'unknown'
where exchange is null;

alter table universe_symbol
    alter column exchange set not null;

drop index if exists uq_universe_symbol;

create unique index if not exists uq_universe_symbol
    on universe_symbol (universe_id, symbol, exchange);
