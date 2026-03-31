package com.openforge.api.backtest.domain

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue

enum class BacktestRunStatus(@get:JsonValue val value: String) {
    QUEUED("queued"),
    RUNNING("running"),
    COMPLETED("completed"),
    FAILED("failed"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): BacktestRunStatus = entries.firstOrNull { it.value == value }
            ?: throw IllegalArgumentException("Unsupported backtestRunStatus: $value")
    }
}

enum class BacktestExitReason(@get:JsonValue val value: String) {
    SIGNAL("signal"),
    STOP_LOSS("stop_loss"),
    TAKE_PROFIT("take_profit"),
    TRAILING_STOP("trailing_stop"),
    END_OF_PERIOD("end_of_period"),
    ;

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): BacktestExitReason = entries.firstOrNull { it.value == value }
            ?: throw IllegalArgumentException("Unsupported backtestExitReason: $value")
    }
}
