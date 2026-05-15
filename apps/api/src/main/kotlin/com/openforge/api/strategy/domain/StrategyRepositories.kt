package com.openforge.api.strategy.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.UUID

interface StrategyRepository : JpaRepository<StrategyEntity, UUID> {
    fun findAllByIsArchivedFalseOrderByUpdatedAtDesc(): List<StrategyEntity>

    fun findByIdAndIsArchivedFalse(id: UUID): StrategyEntity?

    @Query(
        """
        select count(s) > 0
        from StrategyEntity s
        where lower(s.name) = lower(:name)
          and s.isArchived = false
          and (:excludeId is null or s.id <> :excludeId)
        """,
    )
    fun existsActiveByName(
        name: String,
        excludeId: UUID? = null,
    ): Boolean
}

interface StrategyVersionRepository : JpaRepository<StrategyVersionEntity, UUID> {
    fun findAllByStrategyIdOrderByVersionNumberDesc(strategyId: UUID): List<StrategyVersionEntity>

    fun findTopByStrategyIdOrderByVersionNumberDesc(strategyId: UUID): StrategyVersionEntity?

    fun countByStrategyId(strategyId: UUID): Long

    @Query(
        """
        select v.strategyId as id, count(v) as total
        from StrategyVersionEntity v
        where v.strategyId in :strategyIds
        group by v.strategyId
        """,
    )
    fun countByStrategyIdIn(strategyIds: Collection<UUID>): List<UuidCount>
}

interface UniverseRepository : JpaRepository<UniverseEntity, UUID> {
    fun findAllByIsArchivedFalseOrderByUpdatedAtDesc(): List<UniverseEntity>

    fun findAllByMarketScopeAndIsArchivedFalseOrderByUpdatedAtDesc(marketScope: MarketType): List<UniverseEntity>

    fun findByIdAndIsArchivedFalse(id: UUID): UniverseEntity?

    @Query(
        """
        select count(u) > 0
        from UniverseEntity u
        where lower(u.name) = lower(:name)
          and u.isArchived = false
          and (:excludeId is null or u.id <> :excludeId)
        """,
    )
    fun existsActiveByName(
        name: String,
        excludeId: UUID? = null,
    ): Boolean

    fun countByMarketScopeAndIsArchivedFalse(marketScope: MarketType): Long
}

interface UniverseSymbolRepository : JpaRepository<UniverseSymbolEntity, UUID> {
    fun findAllByUniverseIdOrderBySortOrderAscSymbolAscExchangeAsc(universeId: UUID): List<UniverseSymbolEntity>

    fun findAllByUniverseIdInOrderByUniverseIdAscSortOrderAscSymbolAscExchangeAsc(universeIds: Collection<UUID>): List<UniverseSymbolEntity>

    fun deleteAllByUniverseId(universeId: UUID)

    fun countByUniverseId(universeId: UUID): Long

    @Query(
        """
        select s.universeId as id, count(s) as total
        from UniverseSymbolEntity s
        where s.universeId in :universeIds
        group by s.universeId
        """,
    )
    fun countByUniverseIdIn(universeIds: Collection<UUID>): List<UuidCount>
}

interface StrategyUniverseRepository : JpaRepository<StrategyUniverseEntity, UUID> {
    fun findAllByStrategyId(strategyId: UUID): List<StrategyUniverseEntity>

    fun findAllByUniverseId(universeId: UUID): List<StrategyUniverseEntity>

    fun deleteAllByStrategyId(strategyId: UUID)

    fun countByStrategyId(strategyId: UUID): Long

    fun countByUniverseId(universeId: UUID): Long

    @Query(
        """
        select su.strategyId as id, count(su) as total
        from StrategyUniverseEntity su
        where su.strategyId in :strategyIds
        group by su.strategyId
        """,
    )
    fun countByStrategyIdIn(strategyIds: Collection<UUID>): List<UuidCount>

    @Query(
        """
        select su.universeId as id, count(su) as total
        from StrategyUniverseEntity su
        where su.universeId in :universeIds
        group by su.universeId
        """,
    )
    fun countByUniverseIdIn(universeIds: Collection<UUID>): List<UuidCount>
}

interface UuidCount {
    val id: UUID
    val total: Long
}
