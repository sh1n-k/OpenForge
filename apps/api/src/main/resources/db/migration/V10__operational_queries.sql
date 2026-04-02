-- Cross-strategy query indexes
create index if not exists idx_strategy_order_request_requested_at
    on strategy_order_request (requested_at desc);

create index if not exists idx_strategy_order_fill_filled_at
    on strategy_order_fill (filled_at desc);

create index if not exists idx_strategy_risk_event_occurred_at
    on strategy_risk_event (occurred_at desc);
