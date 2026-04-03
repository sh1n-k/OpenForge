update universe
set market_scope = lower(market_scope)
where market_scope <> lower(market_scope);

update universe_symbol
set market = lower(market)
where market <> lower(market);

delete from symbol_master_status upper_status
using symbol_master_status lower_status
where lower(upper_status.market_scope) = lower_status.market_scope
  and upper_status.market_scope <> lower(upper_status.market_scope)
  and lower_status.market_scope = lower(lower_status.market_scope);

update symbol_master_status
set market_scope = lower(market_scope)
where market_scope <> lower(market_scope);
