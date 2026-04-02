package com.openforge.api.symbol

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.transaction.annotation.Transactional

interface SymbolMasterRepository : JpaRepository<SymbolMasterEntity, SymbolMasterId> {
    @Query(
        """
        select s from SymbolMasterEntity s
        where (:exchange is null or s.exchange = :exchange)
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
        exchange: String?,
        limit: org.springframework.data.domain.Pageable,
    ): List<SymbolMasterEntity>

    fun countByExchange(exchange: String): Int

    @Modifying
    @Transactional
    @Query("delete from SymbolMasterEntity s where s.exchange = :exchange")
    fun deleteByExchange(exchange: String)
}

interface SymbolMasterStatusRepository : JpaRepository<SymbolMasterStatusEntity, String>
