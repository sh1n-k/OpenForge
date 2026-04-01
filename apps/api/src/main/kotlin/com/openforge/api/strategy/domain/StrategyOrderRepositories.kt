package com.openforge.api.strategy.domain

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface StrategyOrderRequestRepository : JpaRepository<StrategyOrderRequestEntity, UUID> {
    fun findAllByStrategyIdOrderByRequestedAtDesc(strategyId: UUID, pageable: Pageable): List<StrategyOrderRequestEntity>
    fun findAllByStrategyIdAndSignalEventIdIn(strategyId: UUID, signalEventIds: Collection<UUID>): List<StrategyOrderRequestEntity>
    fun existsByStrategyIdAndSignalEventIdAndSideAndMode(
        strategyId: UUID,
        signalEventId: UUID,
        side: OrderSide,
        mode: OrderMode,
    ): Boolean
}
