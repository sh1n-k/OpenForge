package com.openforge.api.strategy.domain

import com.openforge.api.common.jpa.BaseAuditableEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.UUID

@Entity
@Table(name = "strategy_risk_config")
class StrategyRiskConfigEntity(
    @Id
    @Column(name = "strategy_id", columnDefinition = "uuid")
    var strategyId: UUID,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var mode: OrderMode = OrderMode.PAPER,
    @Column(name = "per_symbol_max_notional", precision = 19, scale = 6)
    var perSymbolMaxNotional: BigDecimal? = null,
    @Column(name = "strategy_max_exposure", precision = 19, scale = 6)
    var strategyMaxExposure: BigDecimal? = null,
    @Column(name = "max_open_positions")
    var maxOpenPositions: Int? = null,
    @Column(name = "daily_loss_limit", precision = 19, scale = 6)
    var dailyLossLimit: BigDecimal? = null,
    @Column(name = "strategy_kill_switch_enabled", nullable = false)
    var strategyKillSwitchEnabled: Boolean = false,
    @Column(name = "live_trading_enabled", nullable = false)
    var liveTradingEnabled: Boolean = false,
    @Column(name = "account_max_order_notional", precision = 19, scale = 6)
    var accountMaxOrderNotional: BigDecimal? = null,
    @Column(name = "account_daily_max_order_notional", precision = 19, scale = 6)
    var accountDailyMaxOrderNotional: BigDecimal? = null,
    @Column(name = "symbol_max_order_notional", precision = 19, scale = 6)
    var symbolMaxOrderNotional: BigDecimal? = null,
    @Column(name = "min_order_notional", nullable = false, precision = 19, scale = 6)
    var minOrderNotional: BigDecimal = BigDecimal("5000.000000"),
    @Column(name = "fee_rate", nullable = false, precision = 12, scale = 8)
    var feeRate: BigDecimal = BigDecimal("0.00015000"),
    @Column(name = "tax_rate", nullable = false, precision = 12, scale = 8)
    var taxRate: BigDecimal = BigDecimal("0.00180000"),
    @Column(name = "close_unfilled_policy", nullable = false, length = 32)
    var closeUnfilledPolicy: String = "cancel",
) : BaseAuditableEntity()

@Entity
@Table(name = "strategy_risk_event")
class StrategyRiskEventEntity(
    @Id
    @Column(columnDefinition = "uuid")
    var id: UUID = UUID.randomUUID(),
    @Column(name = "strategy_id", columnDefinition = "uuid", nullable = false)
    var strategyId: UUID,
    @Column(name = "order_request_id", columnDefinition = "uuid")
    var orderRequestId: UUID? = null,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var scope: RiskEventScope,
    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 48)
    var eventType: StrategyRiskEventType,
    @Column(name = "reason_code", nullable = false, length = 64)
    var reasonCode: String,
    @Column(columnDefinition = "text", nullable = false)
    var message: String,
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    var payload: Map<String, Any?> = emptyMap(),
    @Column(name = "occurred_at", nullable = false)
    var occurredAt: OffsetDateTime,
) : BaseAuditableEntity()
