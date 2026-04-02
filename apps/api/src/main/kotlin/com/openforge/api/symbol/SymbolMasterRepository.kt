package com.openforge.api.symbol

import com.openforge.api.strategy.domain.MarketType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.transaction.annotation.Transactional

interface SymbolMasterRepository : JpaRepository<SymbolMasterEntity, SymbolMasterId> {
    @Query(
        """
        select s from SymbolMasterEntity s
        where s.marketScope = :marketScope
          and (:exchange is null or s.exchange = :exchange)
          and (lower(s.code) like lower(concat('%', :query, '%'))
               or lower(s.name) like lower(concat('%', :query, '%')))
        order by
          case when lower(s.code) = lower(:query) then 0
               when lower(s.name) = lower(:query) then 1
               when lower(s.code) like lower(concat(:query, '%')) then 2
               when lower(s.name) like lower(concat(:query, '%')) then 3
               else 4 end,
          s.code
        """,
    )
    fun search(
        query: String,
        marketScope: String,
        exchange: String?,
        limit: org.springframework.data.domain.Pageable,
    ): List<SymbolMasterEntity>

    fun countByMarketScope(marketScope: String): Int

    fun countByMarketScopeAndExchange(
        marketScope: String,
        exchange: String,
    ): Int

    fun existsByMarketScopeAndCode(
        marketScope: String,
        code: String,
    ): Boolean

    fun existsByMarketScopeAndExchangeAndCode(
        marketScope: String,
        exchange: String,
        code: String,
    ): Boolean

    @Query(
        """
        select distinct s.marketScope
        from SymbolMasterEntity s
        where s.code in :codes
        """,
    )
    fun findDistinctMarketScopesByCodeIn(codes: Collection<String>): List<String>

    @Modifying
    @Transactional
    @Query("delete from SymbolMasterEntity s where s.marketScope = :marketScope")
    fun deleteByMarketScope(marketScope: String)

    @Modifying
    @Transactional
    @Query("delete from SymbolMasterEntity s where s.marketScope = :marketScope and s.exchange = :exchange")
    fun deleteByMarketScopeAndExchange(
        marketScope: String,
        exchange: String,
    )
}

interface SymbolMasterStatusRepository : JpaRepository<SymbolMasterStatusEntity, MarketType>
