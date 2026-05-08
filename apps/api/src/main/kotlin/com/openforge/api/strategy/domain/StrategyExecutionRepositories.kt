package com.openforge.api.strategy.domain

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate
import java.util.UUID

interface StrategyExecutionConfigRepository : JpaRepository<StrategyExecutionConfigEntity, UUID> {
    fun findAllByEnabledTrueOrderByUpdatedAtAsc(): List<StrategyExecutionConfigEntity>
}

interface StrategyExecutionRunRepository : JpaRepository<StrategyExecutionRunEntity, UUID> {
    fun findTopByStrategyIdOrderByStartedAtDesc(strategyId: UUID): StrategyExecutionRunEntity?

    fun findAllByStrategyIdOrderByStartedAtDesc(
        strategyId: UUID,
        pageable: Pageable,
    ): List<StrategyExecutionRunEntity>

    fun findAllByStrategyIdAndScheduledDateAndStatusIn(
        strategyId: UUID,
        scheduledDate: LocalDate,
        statuses: Collection<StrategyExecutionRunStatus>,
    ): List<StrategyExecutionRunEntity>
}

interface StrategySignalEventRepository : JpaRepository<StrategySignalEventEntity, UUID> {
    fun findAllByStrategyIdOrderByCreatedAtDesc(
        strategyId: UUID,
        pageable: Pageable,
    ): List<StrategySignalEventEntity>
}
