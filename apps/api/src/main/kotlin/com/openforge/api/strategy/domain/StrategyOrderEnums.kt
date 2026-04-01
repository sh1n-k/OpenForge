package com.openforge.api.strategy.domain

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue

enum class OrderMode(@get:JsonValue val value: String) {
    PAPER("paper"),
    LIVE("live"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): OrderMode = entries.firstOrNull { it.value == value }
            ?: throw IllegalArgumentException("Unsupported orderMode: $value")
    }
}

enum class OrderSide(@get:JsonValue val value: String) {
    BUY("buy"),
    SELL("sell"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): OrderSide = entries.firstOrNull { it.value == value }
            ?: throw IllegalArgumentException("Unsupported orderSide: $value")
    }
}

enum class OrderType(@get:JsonValue val value: String) {
    LIMIT("limit"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): OrderType = entries.firstOrNull { it.value == value }
            ?: throw IllegalArgumentException("Unsupported orderType: $value")
    }
}

enum class OrderRequestStatus(@get:JsonValue val value: String) {
    REQUESTED("requested"),
    PENDING("pending"),
    REJECTED_DUPLICATE("rejected_duplicate"),
    REJECTED_PRECHECK("rejected_precheck"),
    REJECTED_RISK("rejected_risk"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): OrderRequestStatus = entries.firstOrNull { it.value == value }
            ?: throw IllegalArgumentException("Unsupported orderRequestStatus: $value")
    }
}

enum class OrderLifecycleStatus(@get:JsonValue val value: String) {
    REQUESTED("requested"),
    ACCEPTED("accepted"),
    PARTIALLY_FILLED("partially_filled"),
    FILLED("filled"),
    CANCELLED("cancelled"),
    REJECTED("rejected"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): OrderLifecycleStatus = entries.firstOrNull { it.value == value }
            ?: throw IllegalArgumentException("Unsupported orderLifecycleStatus: $value")
    }
}

enum class OrderFillSource(@get:JsonValue val value: String) {
    PAPER_MANUAL("paper_manual"),
    LIVE_SYNC_RESERVED("live_sync_reserved"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): OrderFillSource = entries.firstOrNull { it.value == value }
            ?: throw IllegalArgumentException("Unsupported orderFillSource: $value")
    }
}

enum class RiskEventScope(@get:JsonValue val value: String) {
    STRATEGY("strategy"),
    GLOBAL("global"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): RiskEventScope = entries.firstOrNull { it.value == value }
            ?: throw IllegalArgumentException("Unsupported riskEventScope: $value")
    }
}

enum class StrategyRiskEventType(@get:JsonValue val value: String) {
    ORDER_BLOCKED("order_blocked"),
    STRATEGY_KILL_SWITCH_CHANGED("strategy_kill_switch_changed"),
    DAILY_LOSS_LIMIT_TRIPPED("daily_loss_limit_tripped"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): StrategyRiskEventType = entries.firstOrNull { it.value == value }
            ?: throw IllegalArgumentException("Unsupported strategyRiskEventType: $value")
    }
}
