update universe_symbol us
set exchange = sm.exchange
from symbol_master sm
where us.exchange is null
  and sm.market_scope = us.market
  and sm.code = us.symbol;

update universe_symbol
set exchange = 'unknown'
where exchange is null;
