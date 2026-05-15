alter table strategy_rebalance_plan
    add column if not exists live_confirmation_phrase text null,
    add column if not exists live_checklist_accepted boolean not null default false;
