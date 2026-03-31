package com.openforge.api.strategy.editor

import com.openforge.api.strategy.domain.PayloadFormat
import com.openforge.api.strategy.domain.StrategyType
import com.openforge.api.strategy.domain.StrategyValidationStatus

data class StrategyValidationMessage(
    val category: String,
    val message: String,
)

data class StrategyValidationResult(
    val valid: Boolean,
    val status: StrategyValidationStatus,
    val normalizedSpec: Map<String, Any?>?,
    val yamlPreview: String,
    val errors: List<StrategyValidationMessage>,
    val warnings: List<StrategyValidationMessage>,
    val summary: String,
)

data class StrategyValidateCommand(
    val strategyType: StrategyType,
    val payloadFormat: PayloadFormat,
    val payload: Map<String, Any?>,
)

data class StrategyEditorIndicatorDefinition(
    val id: String,
    val outputs: Set<String>,
    val defaultOutput: String,
    val defaults: Map<String, Any?>,
)
