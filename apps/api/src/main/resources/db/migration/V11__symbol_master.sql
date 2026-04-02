create table if not exists symbol_master (
    code varchar(12) not null,
    name varchar(120) not null,
    exchange varchar(16) not null,
    primary key (code, exchange)
);

create index idx_symbol_master_name on symbol_master (name);

create table if not exists symbol_master_status (
    id varchar(32) primary key,
    kospi_count integer not null default 0,
    kosdaq_count integer not null default 0,
    collected_at timestamptz null
);

insert into symbol_master_status (id, kospi_count, kosdaq_count, collected_at)
values ('singleton', 0, 0, null)
on conflict do nothing;
