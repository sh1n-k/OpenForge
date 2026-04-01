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
    PENDING("pending"),
    REJECTED_DUPLICATE("rejected_duplicate"),
    REJECTED_PRECHECK("rejected_precheck"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): OrderRequestStatus = entries.firstOrNull { it.value == value }
            ?: throw IllegalArgumentException("Unsupported orderRequestStatus: $value")
    }
}
