package com.openforge.api.strategy.application

import com.openforge.api.strategy.domain.StrategyStatus

object StrategyRuntimeState {
    fun resolveDisplayStatus(
        storedStatus: StrategyStatus,
        executionEnabled: Boolean,
    ): StrategyStatus =
        when {
            executionEnabled -> StrategyStatus.RUNNING
            storedStatus == StrategyStatus.RUNNING -> StrategyStatus.STOPPED
            else -> storedStatus
        }
}
