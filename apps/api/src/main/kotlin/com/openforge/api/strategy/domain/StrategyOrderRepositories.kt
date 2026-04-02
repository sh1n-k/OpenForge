package com.openforge.api.strategy.domain

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.time.OffsetDateTime
import java.util.UUID

interface StrategyOrderRequestRepository : JpaRepository<StrategyOrderRequestEntity, UUID> {
    fun findAllByStrategyId(strategyId: UUID): List<StrategyOrderRequestEntity>

    fun findAllByStrategyIdOrderByRequestedAtDesc(
        strategyId: UUID,
        pageable: Pageable,
    ): List<StrategyOrderRequestEntity>

    fun findAllByStrategyIdAndSignalEventIdIn(
        strategyId: UUID,
        signalEventIds: Collection<UUID>,
    ): List<StrategyOrderRequestEntity>

    fun findByIdAndStrategyId(
        id: UUID,
        strategyId: UUID,
    ): StrategyOrderRequestEntity?

    fun existsByStrategyIdAndSignalEventIdAndSideAndMode(
        strategyId: UUID,
        signalEventId: UUID,
        side: OrderSide,
        mode: OrderMode,
    ): Boolean

    fun findAllByOrderByRequestedAtDesc(pageable: Pageable): List<StrategyOrderRequestEntity>

    fun findAllByStrategyIdAndRequestedAtAfter(
        strategyId: UUID,
        after: OffsetDateTime,
    ): List<StrategyOrderRequestEntity>
}

interface StrategyOrderStatusEventRepository : JpaRepository<StrategyOrderStatusEventEntity, UUID> {
    fun findAllByOrderRequestIdOrderByOccurredAtAsc(orderRequestId: UUID): List<StrategyOrderStatusEventEntity>

    fun findAllByOrderRequestIdOrderByOccurredAtDesc(
        orderRequestId: UUID,
        pageable: Pageable,
    ): List<StrategyOrderStatusEventEntity>

    fun findTopByOrderRequestIdOrderByOccurredAtDesc(orderRequestId: UUID): StrategyOrderStatusEventEntity?
}

interface StrategyOrderFillRepository : JpaRepository<StrategyOrderFillEntity, UUID> {
    fun findAllByStrategyIdOrderByFilledAtDesc(
        strategyId: UUID,
        pageable: Pageable,
    ): List<StrategyOrderFillEntity>

    fun findAllByStrategyIdOrderByFilledAtAsc(strategyId: UUID): List<StrategyOrderFillEntity>

    fun findAllByOrderRequestIdOrderByFilledAtAsc(orderRequestId: UUID): List<StrategyOrderFillEntity>

    fun findAllByOrderByFilledAtDesc(pageable: Pageable): List<StrategyOrderFillEntity>
}
