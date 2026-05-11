package com.openforge.api.strategy.domain

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
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

    fun findAllByStrategyIdInAndRequestedAtAfter(
        strategyIds: Collection<UUID>,
        after: OffsetDateTime,
    ): List<StrategyOrderRequestEntity>
}

interface StrategyOrderStatusEventRepository : JpaRepository<StrategyOrderStatusEventEntity, UUID> {
    fun findAllByOrderRequestIdOrderByOccurredAtAsc(orderRequestId: UUID): List<StrategyOrderStatusEventEntity>

    fun findAllByOrderRequestIdOrderByOccurredAtDesc(
        orderRequestId: UUID,
        pageable: Pageable,
    ): List<StrategyOrderStatusEventEntity>

    fun findAllByOrderRequestIdInOrderByOccurredAtDesc(orderRequestIds: Collection<UUID>): List<StrategyOrderStatusEventEntity>

    @Query(
        value =
            """
            select *
            from strategy_order_status_event
            where id in (
                select distinct on (order_request_id) id
                from strategy_order_status_event
                where order_request_id in (:orderRequestIds)
                order by order_request_id, occurred_at desc
            )
            """,
        nativeQuery = true,
    )
    fun findLatestByOrderRequestIdIn(orderRequestIds: Collection<UUID>): List<StrategyOrderStatusEventEntity>

    fun findTopByOrderRequestIdOrderByOccurredAtDesc(orderRequestId: UUID): StrategyOrderStatusEventEntity?
}

interface StrategyOrderFillRepository : JpaRepository<StrategyOrderFillEntity, UUID> {
    fun findAllByStrategyIdOrderByFilledAtDesc(
        strategyId: UUID,
        pageable: Pageable,
    ): List<StrategyOrderFillEntity>

    fun findAllByStrategyIdInOrderByFilledAtDesc(
        strategyIds: Collection<UUID>,
        pageable: Pageable,
    ): List<StrategyOrderFillEntity>

    fun findAllByStrategyIdOrderByFilledAtAsc(strategyId: UUID): List<StrategyOrderFillEntity>

    fun findAllByStrategyIdInOrderByStrategyIdAscFilledAtAsc(strategyIds: Collection<UUID>): List<StrategyOrderFillEntity>

    fun findAllByOrderRequestIdOrderByFilledAtAsc(orderRequestId: UUID): List<StrategyOrderFillEntity>

    fun findAllByOrderRequestIdInOrderByFilledAtAsc(orderRequestIds: Collection<UUID>): List<StrategyOrderFillEntity>

    @Query(
        """
        select f.orderRequestId as id, coalesce(sum(f.quantity), 0) as total
        from StrategyOrderFillEntity f
        where f.orderRequestId in :orderRequestIds
        group by f.orderRequestId
        """,
    )
    fun sumQuantityByOrderRequestIdIn(orderRequestIds: Collection<UUID>): List<UuidCount>

    fun findAllByOrderByFilledAtDesc(pageable: Pageable): List<StrategyOrderFillEntity>
}
