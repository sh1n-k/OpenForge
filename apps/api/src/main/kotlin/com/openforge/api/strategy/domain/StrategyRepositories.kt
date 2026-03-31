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
    fun existsActiveByName(name: String, excludeId: UUID? = null): Boolean
}

interface StrategyVersionRepository : JpaRepository<StrategyVersionEntity, UUID> {
    fun findAllByStrategyIdOrderByVersionNumberDesc(strategyId: UUID): List<StrategyVersionEntity>
    fun findTopByStrategyIdOrderByVersionNumberDesc(strategyId: UUID): StrategyVersionEntity?
    fun countByStrategyId(strategyId: UUID): Long
}

interface UniverseRepository : JpaRepository<UniverseEntity, UUID> {
    fun findAllByIsArchivedFalseOrderByUpdatedAtDesc(): List<UniverseEntity>
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
    fun existsActiveByName(name: String, excludeId: UUID? = null): Boolean
}

interface UniverseSymbolRepository : JpaRepository<UniverseSymbolEntity, UUID> {
    fun findAllByUniverseIdOrderBySortOrderAscSymbolAsc(universeId: UUID): List<UniverseSymbolEntity>
    fun deleteAllByUniverseId(universeId: UUID)
    fun countByUniverseId(universeId: UUID): Long
}

interface StrategyUniverseRepository : JpaRepository<StrategyUniverseEntity, UUID> {
    fun findAllByStrategyId(strategyId: UUID): List<StrategyUniverseEntity>
    fun findAllByUniverseId(universeId: UUID): List<StrategyUniverseEntity>
    fun deleteAllByStrategyId(strategyId: UUID)
    fun countByStrategyId(strategyId: UUID): Long
    fun countByUniverseId(universeId: UUID): Long
}

