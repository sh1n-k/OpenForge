alter table strategy_version
    add column normalized_spec jsonb null,
    add column validation_status varchar(32) not null default 'invalid',
    add column validation_errors jsonb not null default '[]'::jsonb,
    add column validation_warnings jsonb not null default '[]'::jsonb;
