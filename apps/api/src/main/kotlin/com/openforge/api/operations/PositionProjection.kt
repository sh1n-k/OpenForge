package com.openforge.api.operations

import com.openforge.api.strategy.domain.OrderSide
import com.openforge.api.strategy.domain.StrategyOrderFillEntity
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.OffsetDateTime
import java.util.UUID

internal fun currentPositionsByStrategy(fills: List<StrategyOrderFillEntity>): Map<UUID, List<PositionProjection>> {
    val statesByStrategy = linkedMapOf<UUID, LinkedHashMap<String, PositionState>>()
    fills.forEach { fill ->
        val states = statesByStrategy.getOrPut(fill.strategyId) { linkedMapOf() }
        val current = states.getOrPut(fill.symbol) { PositionState(symbol = fill.symbol) }
        when (fill.side) {
            OrderSide.BUY -> {
                val nextQuantity = current.netQuantity + fill.quantity
                val totalCost =
                    current.avgEntryPrice * BigDecimal.valueOf(current.netQuantity) +
                        fill.price * BigDecimal.valueOf(fill.quantity)
                current.netQuantity = nextQuantity
                current.avgEntryPrice =
                    if (nextQuantity == 0L) {
                        BigDecimal.ZERO.scaled()
                    } else {
                        totalCost.divide(BigDecimal.valueOf(nextQuantity), 6, RoundingMode.HALF_UP).scaled()
                    }
            }

            OrderSide.SELL -> {
                if (current.netQuantity < fill.quantity) {
                    throw ResponseStatusException(HttpStatus.CONFLICT, "Stored fill stream would create a negative position")
                }
                current.netQuantity -= fill.quantity
                if (current.netQuantity == 0L) {
                    current.avgEntryPrice = BigDecimal.ZERO.scaled()
                }
            }
        }
        current.lastFillAt = fill.filledAt
    }
    return statesByStrategy.mapValues { (_, states) ->
        states.values
            .filter { it.netQuantity > 0L }
            .sortedBy { it.symbol }
            .map {
                PositionProjection(
                    symbol = it.symbol,
                    netQuantity = it.netQuantity,
                    avgEntryPrice = it.avgEntryPrice,
                    lastFillAt = it.lastFillAt,
                )
            }
    }
}

private fun BigDecimal.scaled(): BigDecimal = setScale(6, RoundingMode.HALF_UP)

internal data class PositionProjection(
    val symbol: String,
    val netQuantity: Long,
    val avgEntryPrice: BigDecimal,
    val lastFillAt: OffsetDateTime?,
)

private data class PositionState(
    val symbol: String,
    var netQuantity: Long = 0,
    var avgEntryPrice: BigDecimal = BigDecimal.ZERO.setScale(6, RoundingMode.HALF_UP),
    var lastFillAt: OffsetDateTime? = null,
)
