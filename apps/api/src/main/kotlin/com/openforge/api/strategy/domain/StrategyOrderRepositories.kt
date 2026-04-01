package com.openforge.api.strategy.domain

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface StrategyOrderRequestRepository : JpaRepository<StrategyOrderRequestEntity, UUID> {
    fun findAllByStrategyIdOrderByRequestedAtDesc(strategyId: UUID, pageable: Pageable): List<StrategyOrderRequestEntity>
    fun findAllByStrategyIdAndSignalEventIdIn(strategyId: UUID, signalEventIds: Collection<UUID>): List<StrategyOrderRequestEntity>
    fun findByIdAndStrategyId(id: UUID, strategyId: UUID): StrategyOrderRequestEntity?
    fun existsByStrategyIdAndSignalEventIdAndSideAndMode(
        strategyId: UUID,
        signalEventId: UUID,
        side: OrderSide,
        mode: OrderMode,
    ): Boolean
}

interface StrategyOrderStatusEventRepository : JpaRepository<StrategyOrderStatusEventEntity, UUID> {
    fun findAllByOrderRequestIdOrderByOccurredAtAsc(orderRequestId: UUID): List<StrategyOrderStatusEventEntity>
    fun findAllByOrderRequestIdOrderByOccurredAtDesc(orderRequestId: UUID, pageable: Pageable): List<StrategyOrderStatusEventEntity>
    fun findTopByOrderRequestIdOrderByOccurredAtDesc(orderRequestId: UUID): StrategyOrderStatusEventEntity?
}

interface StrategyOrderFillRepository : JpaRepository<StrategyOrderFillEntity, UUID> {
    fun findAllByStrategyIdOrderByFilledAtDesc(strategyId: UUID, pageable: Pageable): List<StrategyOrderFillEntity>
    fun findAllByStrategyIdOrderByFilledAtAsc(strategyId: UUID): List<StrategyOrderFillEntity>
    fun findAllByOrderRequestIdOrderByFilledAtAsc(orderRequestId: UUID): List<StrategyOrderFillEntity>
}
