package com.openforge.api.strategy.domain

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue

enum class StrategyType(
    @get:JsonValue val value: String,
) {
    BUILDER("builder"),
    CODE("code"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): StrategyType =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unsupported strategyType: $value")
    }
}

enum class StrategyStatus(
    @get:JsonValue val value: String,
) {
    DRAFT("draft"),
    BACKTEST_COMPLETED("backtest_completed"),
    RUNNING("running"),
    STOPPED("stopped"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): StrategyStatus =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unsupported strategyStatus: $value")
    }
}

enum class PayloadFormat(
    @get:JsonValue val value: String,
) {
    BUILDER_JSON("builder_json"),
    CODE_TEXT("code_text"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): PayloadFormat =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unsupported payloadFormat: $value")
    }
}

enum class MarketType(
    @get:JsonValue val value: String,
) {
    DOMESTIC("domestic"),
    US("us"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): MarketType =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unsupported marketType: $value")
    }
}

enum class StrategyValidationStatus(
    @get:JsonValue val value: String,
) {
    VALID("valid"),
    INVALID("invalid"),
    INVALID_LEGACY_DRAFT("invalid_legacy_draft"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): StrategyValidationStatus =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unsupported strategyValidationStatus: $value")
    }
}
