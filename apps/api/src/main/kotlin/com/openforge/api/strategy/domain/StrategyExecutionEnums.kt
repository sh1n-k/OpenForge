package com.openforge.api.strategy.domain

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue

enum class StrategyExecutionMode(
    @get:JsonValue val value: String,
) {
    PAPER("paper"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): StrategyExecutionMode =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unsupported strategyExecutionMode: $value")
    }
}

enum class StrategyExecutionTriggerType(
    @get:JsonValue val value: String,
) {
    SCHEDULED("scheduled"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): StrategyExecutionTriggerType =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unsupported strategyExecutionTriggerType: $value")
    }
}

enum class StrategyExecutionRunStatus(
    @get:JsonValue val value: String,
) {
    RUNNING("running"),
    COMPLETED("completed"),
    FAILED("failed"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): StrategyExecutionRunStatus =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unsupported strategyExecutionRunStatus: $value")
    }
}

enum class StrategySignalType(
    @get:JsonValue val value: String,
) {
    ENTRY("entry"),
    EXIT("exit"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): StrategySignalType =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unsupported strategySignalType: $value")
    }
}
