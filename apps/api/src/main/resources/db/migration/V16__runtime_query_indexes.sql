create index if not exists idx_strategy_execution_run_status_started_at
    on strategy_execution_run (status, started_at asc);

create index if not exists idx_strategy_execution_run_schedule_status
    on strategy_execution_run (strategy_id, scheduled_date, status);

create index if not exists idx_strategy_execution_config_enabled_updated_at
    on strategy_execution_config (enabled, updated_at asc);

create index if not exists idx_app_event_log_created_at
    on app_event_log (created_at desc);

create index if not exists idx_app_event_log_type_created_at
    on app_event_log (event_type, created_at desc);
