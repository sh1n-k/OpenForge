package com.openforge.api.strategy.editor

import com.openforge.api.strategy.domain.PayloadFormat
import com.openforge.api.strategy.domain.StrategyType
import com.openforge.api.strategy.domain.StrategyValidationStatus
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import org.yaml.snakeyaml.DumperOptions
import org.yaml.snakeyaml.Yaml
import java.util.LinkedHashMap

@Service
class StrategyEditorService {
    private val yaml = Yaml(dumperOptions())

    private val indicators = IndicatorRegistry.indicators
    private val supportedOperators = IndicatorRegistry.supportedOperators
    private val supportedPriceFields = IndicatorRegistry.supportedPriceFields
    private val conditionKeys = IndicatorRegistry.conditionKeys
    private val builderRootKeys = IndicatorRegistry.builderRootKeys

    fun validate(command: StrategyValidateCommand): StrategyValidationResult =
        when (command.strategyType) {
            StrategyType.BUILDER -> validateBuilder(command.payloadFormat, command.payload)
            StrategyType.CODE -> validateCode(command.payloadFormat, command.payload)
        }

    fun validateOrThrow(command: StrategyValidateCommand): StrategyValidationResult {
        val result = validate(command)
        if (!result.valid) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                result.errors.joinToString("; ") { "${it.category}: ${it.message}" },
            )
        }
        return result
    }

    fun validateStoredPayload(
        strategyType: StrategyType,
        payloadFormat: PayloadFormat,
        payload: Map<String, Any?>,
    ): StrategyValidationResult = validate(StrategyValidateCommand(strategyType, payloadFormat, payload))

    fun builderTemplate(
        name: String,
        description: String?,
    ): Map<String, Any?> =
        linkedMapOf(
            "builderState" to
                linkedMapOf(
                    "metadata" to
                        linkedMapOf(
                            "id" to slugify(name),
                            "name" to name,
                            "description" to (description ?: ""),
                            "category" to "custom",
                            "author" to "OpenForge",
                            "tags" to emptyList<String>(),
                        ),
                    "indicators" to emptyList<Map<String, Any?>>(),
                    "entry" to
                        linkedMapOf(
                            "logic" to "AND",
                            "conditions" to emptyList<Map<String, Any?>>(),
                        ),
                    "exit" to
                        linkedMapOf(
                            "logic" to "AND",
                            "conditions" to emptyList<Map<String, Any?>>(),
                        ),
                    "risk" to defaultBuilderRisk(),
                ),
        )

    fun codeTemplate(
        name: String,
        description: String?,
    ): String =
        renderYaml(
            linkedMapOf(
                "version" to "1.0",
                "metadata" to
                    linkedMapOf(
                        "name" to name,
                        "description" to (description ?: ""),
                        "author" to "OpenForge",
                        "tags" to emptyList<String>(),
                    ),
                "strategy" to
                    linkedMapOf(
                        "id" to slugify(name),
                        "category" to "custom",
                        "indicators" to emptyList<Map<String, Any?>>(),
                        "entry" to linkedMapOf("logic" to "AND", "conditions" to emptyList<Map<String, Any?>>()),
                        "exit" to linkedMapOf("logic" to "AND", "conditions" to emptyList<Map<String, Any?>>()),
                    ),
                "risk" to defaultNormalizedRisk(),
            ),
        )

    fun renderNormalizedSpec(normalizedSpec: Map<String, Any?>): String = renderYaml(normalizedSpec)

    private fun validateBuilder(
        payloadFormat: PayloadFormat,
        payload: Map<String, Any?>,
    ): StrategyValidationResult {
        val errors = mutableListOf<StrategyValidationMessage>()
        val warnings = mutableListOf<StrategyValidationMessage>()

        if (payloadFormat != PayloadFormat.BUILDER_JSON) {
            errors += error("schema", "Builder strategies require builder_json payloadFormat")
            return invalid(errors, warnings)
        }

        val rawBuilderState =
            when {
                payload["builderState"] is Map<*, *> -> payload["builderState"] as Map<*, *>
                payload.keys.any { builderRootKeys.contains(it) } -> {
                    warnings += warning("schema", "Legacy builder payload detected. Re-save to upgrade the draft.")
                    payload
                }
                else -> null
            }

        if (rawBuilderState == null) {
            errors += error("schema", "builder_json payload must include builderState object")
            return invalid(errors, warnings)
        }

        val normalized = normalizeBuilderState(rawBuilderState, errors, warnings)
        return buildResult(normalized, errors, warnings)
    }

    private fun validateCode(
        payloadFormat: PayloadFormat,
        payload: Map<String, Any?>,
    ): StrategyValidationResult {
        val errors = mutableListOf<StrategyValidationMessage>()
        val warnings = mutableListOf<StrategyValidationMessage>()

        if (payloadFormat != PayloadFormat.CODE_TEXT) {
            errors += error("schema", "Code strategies require code_text payloadFormat")
            return invalid(errors, warnings)
        }

        val sourceKind = payload["sourceKind"]
        if (sourceKind != null && sourceKind != "openforge_yaml") {
            errors += error("schema", "code_text payload sourceKind must be openforge_yaml")
        }

        val source = payload["source"] as? String
        if (source.isNullOrBlank()) {
            errors += error("schema", "code_text payload must include source")
            return invalid(errors, warnings)
        }

        val loaded: Any? =
            try {
                yaml.load<Any>(source)
            } catch (exception: Exception) {
                errors += error("syntax", exception.message ?: "YAML syntax error")
                return invalid(errors, warnings)
            }

        if (loaded !is Map<*, *>) {
            errors += error("schema", "OpenForge YAML DSL must be a top-level object")
            return invalid(errors, warnings)
        }

        val normalized = normalizeYamlSpec(loaded, errors, warnings)
        return buildResult(normalized, errors, warnings)
    }

    private fun buildResult(
        normalizedSpec: Map<String, Any?>?,
        errors: List<StrategyValidationMessage>,
        warnings: List<StrategyValidationMessage>,
    ): StrategyValidationResult {
        val valid = errors.isEmpty() && normalizedSpec != null
        val status = if (valid) StrategyValidationStatus.VALID else StrategyValidationStatus.INVALID
        val summary =
            if (valid) {
                if (warnings.isEmpty()) {
                    "Validation passed"
                } else {
                    "Validation passed with ${warnings.size} warning(s)"
                }
            } else {
                "Validation failed with ${errors.size} error(s)"
            }
        return StrategyValidationResult(
            valid = valid,
            status = status,
            normalizedSpec = normalizedSpec,
            yamlPreview = if (normalizedSpec != null) renderYaml(normalizedSpec) else "",
            errors = errors,
            warnings = warnings,
            summary = summary,
        )
    }

    private fun invalid(
        errors: List<StrategyValidationMessage>,
        warnings: List<StrategyValidationMessage>,
        status: StrategyValidationStatus = StrategyValidationStatus.INVALID,
    ): StrategyValidationResult =
        StrategyValidationResult(
            valid = false,
            status = status,
            normalizedSpec = null,
            yamlPreview = "",
            errors = errors,
            warnings = warnings,
            summary = "Validation failed with ${errors.size} error(s)",
        )

    private fun normalizeBuilderState(
        rawBuilderState: Map<*, *>,
        errors: MutableList<StrategyValidationMessage>,
        warnings: MutableList<StrategyValidationMessage>,
    ): Map<String, Any?>? {
        val metadata = mapValue(rawBuilderState["metadata"])
        if (metadata == null) {
            errors += error("schema", "Builder metadata section is required")
            return null
        }

        val name = metadata["name"]?.toString()?.trim().orEmpty()
        if (name.isBlank()) {
            errors += error("schema", "Builder metadata.name is required")
        }

        val description = metadata["description"]?.toString()?.trim().orEmpty()
        val author = metadata["author"]?.toString()?.trim().takeUnless { it.isNullOrBlank() } ?: "OpenForge"
        val category = metadata["category"]?.toString()?.trim().takeUnless { it.isNullOrBlank() } ?: "custom"
        val strategyId = metadata["id"]?.toString()?.trim().takeUnless { it.isNullOrBlank() } ?: slugify(name.ifBlank { "strategy" })
        val tags = listValue(metadata["tags"]).orEmpty().mapNotNull { it?.toString()?.trim()?.takeIf(String::isNotBlank) }

        val indicatorsRaw = listValue(rawBuilderState["indicators"]).orEmpty()
        val normalizedIndicators = mutableListOf<Map<String, Any?>>()
        val indicatorOutputsByAlias = linkedMapOf<String, Set<String>>()
        indicatorsRaw.forEachIndexed { index, rawIndicator ->
            val normalizedIndicator = normalizeBuilderIndicator(rawIndicator, index, errors)
            if (normalizedIndicator != null) {
                normalizedIndicators += normalizedIndicator
                indicatorOutputsByAlias[normalizedIndicator["alias"] as String] =
                    indicators[normalizedIndicator["id"] as String]?.outputs.orEmpty()
            }
        }

        val entry = normalizeBuilderConditionGroup(rawBuilderState["entry"], "entry", indicatorOutputsByAlias, errors)
        val exit = normalizeBuilderConditionGroup(rawBuilderState["exit"], "exit", indicatorOutputsByAlias, errors)
        val risk = normalizeBuilderRisk(rawBuilderState["risk"], errors)

        if (errors.isNotEmpty() || entry == null || exit == null || risk == null) {
            return null
        }

        return linkedMapOf(
            "version" to "1.0",
            "metadata" to
                linkedMapOf(
                    "name" to name,
                    "description" to description,
                    "author" to author,
                    "tags" to tags,
                ),
            "strategy" to
                linkedMapOf(
                    "id" to strategyId,
                    "category" to category,
                    "indicators" to normalizedIndicators,
                    "entry" to entry,
                    "exit" to exit,
                ),
            "risk" to risk,
        )
    }

    private fun normalizeYamlSpec(
        rawSpec: Map<*, *>,
        errors: MutableList<StrategyValidationMessage>,
        warnings: MutableList<StrategyValidationMessage>,
    ): Map<String, Any?>? {
        val metadata = mapValue(rawSpec["metadata"])
        val strategy = mapValue(rawSpec["strategy"])
        if (metadata == null) {
            errors += error("schema", "metadata section is required")
        }
        if (strategy == null) {
            errors += error("schema", "strategy section is required")
        }
        if (metadata == null || strategy == null) {
            return null
        }

        val name = metadata["name"]?.toString()?.trim().orEmpty()
        if (name.isBlank()) {
            errors += error("schema", "metadata.name is required")
        }

        val description = metadata["description"]?.toString()?.trim().orEmpty()
        val author = metadata["author"]?.toString()?.trim().takeUnless { it.isNullOrBlank() } ?: "OpenForge"
        if (metadata["author"] == null) {
            warnings += warning("schema", "metadata.author defaulted to OpenForge")
        }
        val tags = listValue(metadata["tags"]).orEmpty().mapNotNull { it?.toString()?.trim()?.takeIf(String::isNotBlank) }
        val version = rawSpec["version"]?.toString()?.trim().takeUnless { it.isNullOrBlank() } ?: "1.0"
        if (rawSpec["version"] == null) {
            warnings += warning("schema", "version defaulted to 1.0")
        }

        val strategyId = strategy["id"]?.toString()?.trim().takeUnless { it.isNullOrBlank() } ?: slugify(name.ifBlank { "strategy" })
        if (strategy["id"] == null) {
            warnings += warning("schema", "strategy.id defaulted from metadata.name")
        }
        val category = strategy["category"]?.toString()?.trim().takeUnless { it.isNullOrBlank() } ?: "custom"
        if (strategy["category"] == null) {
            warnings += warning("schema", "strategy.category defaulted to custom")
        }

        val normalizedIndicators = mutableListOf<Map<String, Any?>>()
        val indicatorOutputsByAlias = linkedMapOf<String, Set<String>>()
        listValue(strategy["indicators"]).orEmpty().forEachIndexed { index, rawIndicator ->
            val normalizedIndicator = normalizeYamlIndicator(rawIndicator, index, errors)
            if (normalizedIndicator != null) {
                normalizedIndicators += normalizedIndicator
                indicatorOutputsByAlias[normalizedIndicator["alias"] as String] =
                    indicators[normalizedIndicator["id"] as String]?.outputs.orEmpty()
            }
        }

        val entry = normalizeYamlConditionGroup(strategy["entry"], "entry", indicatorOutputsByAlias, errors, warnings)
        val exit = normalizeYamlConditionGroup(strategy["exit"], "exit", indicatorOutputsByAlias, errors, warnings)
        val risk = normalizeYamlRisk(rawSpec["risk"], warnings)

        if (errors.isNotEmpty() || entry == null || exit == null) {
            return null
        }

        return linkedMapOf(
            "version" to version,
            "metadata" to
                linkedMapOf(
                    "name" to name,
                    "description" to description,
                    "author" to author,
                    "tags" to tags,
                ),
            "strategy" to
                linkedMapOf(
                    "id" to strategyId,
                    "category" to category,
                    "indicators" to normalizedIndicators,
                    "entry" to entry,
                    "exit" to exit,
                ),
            "risk" to risk,
        )
    }

    private fun normalizeBuilderIndicator(
        rawIndicator: Any?,
        index: Int,
        errors: MutableList<StrategyValidationMessage>,
    ): Map<String, Any?>? {
        val indicator = mapValue(rawIndicator)
        if (indicator == null) {
            errors += error("schema", "Indicator #${index + 1} must be an object")
            return null
        }

        val indicatorId = indicator["indicatorId"]?.toString()?.trim().orEmpty()
        val definition = indicators[indicatorId]
        if (definition == null) {
            errors += error("reference", "Unsupported indicator id: $indicatorId")
            return null
        }

        val alias = indicator["alias"]?.toString()?.trim().orEmpty()
        if (alias.isBlank()) {
            errors += error("schema", "Indicator alias is required for $indicatorId")
            return null
        }

        val output = indicator["output"]?.toString()?.trim().takeUnless { it.isNullOrBlank() } ?: definition.defaultOutput
        if (!definition.outputs.contains(output)) {
            errors += error("reference", "Unsupported output '$output' for indicator $indicatorId")
            return null
        }

        return linkedMapOf(
            "id" to indicatorId,
            "alias" to alias,
            "params" to normalizeIndicatorParams(indicatorId, indicator["params"], definition, errors),
            "output" to output,
        )
    }

    private fun normalizeYamlIndicator(
        rawIndicator: Any?,
        index: Int,
        errors: MutableList<StrategyValidationMessage>,
    ): Map<String, Any?>? {
        val indicator = mapValue(rawIndicator)
        if (indicator == null) {
            errors += error("schema", "strategy.indicators[$index] must be an object")
            return null
        }

        val indicatorId = indicator["id"]?.toString()?.trim().orEmpty()
        val definition = indicators[indicatorId]
        if (definition == null) {
            errors += error("reference", "Unsupported indicator id: $indicatorId")
            return null
        }

        val alias = indicator["alias"]?.toString()?.trim().orEmpty()
        if (alias.isBlank()) {
            errors += error("schema", "Indicator alias is required for $indicatorId")
            return null
        }

        val output = indicator["output"]?.toString()?.trim().takeUnless { it.isNullOrBlank() } ?: definition.defaultOutput
        if (!definition.outputs.contains(output)) {
            errors += error("reference", "Unsupported output '$output' for indicator $indicatorId")
            return null
        }

        return linkedMapOf(
            "id" to indicatorId,
            "alias" to alias,
            "params" to normalizeIndicatorParams(indicatorId, indicator["params"], definition, errors),
            "output" to output,
        )
    }

    private fun normalizeIndicatorParams(
        indicatorId: String,
        rawParams: Any?,
        definition: StrategyEditorIndicatorDefinition,
        errors: MutableList<StrategyValidationMessage>,
    ): Map<String, Any?> {
        val params = mapValue(rawParams).orEmpty()
        val normalized = LinkedHashMap(definition.defaults)
        params.keys
            .map { it.toString() }
            .filterNot { definition.defaults.containsKey(it) }
            .forEach { errors += error("schema", "Unsupported parameter '$it' for indicator $indicatorId") }

        definition.defaults.forEach { (key, defaultValue) ->
            val candidate = params[key] ?: defaultValue
            val number = asNumber(candidate)
            if (number == null) {
                errors += error("schema", "Indicator parameter '$key' for $indicatorId must be numeric")
            } else {
                normalized[key] = number.toInt()
            }
        }

        return normalized
    }

    private fun normalizeBuilderConditionGroup(
        rawGroup: Any?,
        label: String,
        outputsByAlias: Map<String, Set<String>>,
        errors: MutableList<StrategyValidationMessage>,
    ): Map<String, Any?>? {
        val group = mapValue(rawGroup)
        if (group == null) {
            errors += error("schema", "$label condition group is required")
            return null
        }
        val logic = normalizeLogic(group["logic"], label, errors)
        val normalizedConditions =
            listValue(group["conditions"]).orEmpty().mapIndexedNotNull { index, rawCondition ->
                normalizeCondition(rawCondition, "$label.conditions[$index]", outputsByAlias, errors)
            }
        if (logic == null) {
            return null
        }
        return linkedMapOf(
            "logic" to logic,
            "conditions" to normalizedConditions,
        )
    }

    private fun normalizeYamlConditionGroup(
        rawGroup: Any?,
        label: String,
        outputsByAlias: Map<String, Set<String>>,
        errors: MutableList<StrategyValidationMessage>,
        warnings: MutableList<StrategyValidationMessage>,
    ): Map<String, Any?>? {
        if (rawGroup == null) {
            warnings += warning("schema", "$label group defaulted to empty AND group")
            return linkedMapOf("logic" to "AND", "conditions" to emptyList<Map<String, Any?>>())
        }
        val group = mapValue(rawGroup)
        if (group == null) {
            errors += error("schema", "$label condition group must be an object")
            return null
        }
        val logic = normalizeLogic(group["logic"], label, errors)
        val normalizedConditions =
            listValue(group["conditions"]).orEmpty().mapIndexedNotNull { index, rawCondition ->
                normalizeCondition(rawCondition, "$label.conditions[$index]", outputsByAlias, errors)
            }
        if (logic == null) {
            return null
        }
        return linkedMapOf(
            "logic" to logic,
            "conditions" to normalizedConditions,
        )
    }

    private fun normalizeCondition(
        rawCondition: Any?,
        path: String,
        outputsByAlias: Map<String, Set<String>>,
        errors: MutableList<StrategyValidationMessage>,
    ): Map<String, Any?>? {
        val condition = mapValue(rawCondition)
        if (condition == null) {
            errors += error("schema", "$path must be an object")
            return null
        }

        condition.keys
            .map { it.toString() }
            .filterNot { conditionKeys.contains(it) }
            .forEach { errors += error("schema", "$path contains unsupported key '$it'") }

        val operator = condition["operator"]?.toString()?.trim().orEmpty()
        if (!supportedOperators.contains(operator)) {
            errors += error("reference", "$path has unsupported operator '$operator'")
            return null
        }

        val left = normalizeOperand(condition["left"], "$path.left", outputsByAlias, errors)
        val right = normalizeOperand(condition["right"], "$path.right", outputsByAlias, errors)
        if (left == null || right == null) {
            return null
        }

        return linkedMapOf(
            "left" to left,
            "operator" to operator,
            "right" to right,
        )
    }

    private fun normalizeOperand(
        rawOperand: Any?,
        path: String,
        outputsByAlias: Map<String, Set<String>>,
        errors: MutableList<StrategyValidationMessage>,
    ): Map<String, Any?>? {
        val operand = mapValue(rawOperand)
        if (operand == null) {
            errors += error("schema", "$path must be an object")
            return null
        }

        return when (val type = operand["type"]?.toString()?.trim().orEmpty()) {
            "price" -> {
                val field = operand["field"]?.toString()?.trim().orEmpty()
                if (!supportedPriceFields.contains(field)) {
                    errors += error("reference", "$path has unsupported price field '$field'")
                    null
                } else {
                    linkedMapOf("type" to type, "field" to field)
                }
            }

            "indicator" -> {
                val alias = operand["alias"]?.toString()?.trim().orEmpty()
                val output = operand["output"]?.toString()?.trim().orEmpty()
                val outputs = outputsByAlias[alias]
                when {
                    alias.isBlank() -> {
                        errors += error("schema", "$path indicator alias is required")
                        null
                    }
                    outputs == null -> {
                        errors += error("reference", "$path references unknown indicator alias '$alias'")
                        null
                    }
                    !outputs.contains(output) -> {
                        errors += error("reference", "$path references unsupported output '$output' for alias '$alias'")
                        null
                    }
                    else -> linkedMapOf("type" to type, "alias" to alias, "output" to output)
                }
            }

            "value" -> {
                val number = asNumber(operand["value"])
                if (number == null) {
                    errors += error("schema", "$path value operand must include numeric value")
                    null
                } else {
                    linkedMapOf("type" to type, "value" to number)
                }
            }

            else -> {
                errors += error("schema", "$path has unsupported operand type '$type'")
                null
            }
        }
    }

    private fun normalizeBuilderRisk(
        rawRisk: Any?,
        errors: MutableList<StrategyValidationMessage>,
    ): Map<String, Any?>? {
        val risk = mapValue(rawRisk) ?: defaultBuilderRisk()
        return linkedMapOf(
            "stop_loss" to normalizeRiskItem(risk["stopLoss"], "stopLoss", errors),
            "take_profit" to normalizeRiskItem(risk["takeProfit"], "takeProfit", errors),
            "trailing_stop" to normalizeRiskItem(risk["trailingStop"], "trailingStop", errors),
        )
    }

    private fun normalizeYamlRisk(
        rawRisk: Any?,
        warnings: MutableList<StrategyValidationMessage>,
    ): Map<String, Any?> {
        if (rawRisk == null) {
            warnings += warning("schema", "risk section defaulted to disabled rules")
            return defaultNormalizedRisk()
        }
        val risk = mapValue(rawRisk).orEmpty()
        return linkedMapOf(
            "stop_loss" to normalizeYamlRiskItem(risk["stop_loss"]),
            "take_profit" to normalizeYamlRiskItem(risk["take_profit"]),
            "trailing_stop" to normalizeYamlRiskItem(risk["trailing_stop"]),
        )
    }

    private fun normalizeRiskItem(
        rawItem: Any?,
        label: String,
        errors: MutableList<StrategyValidationMessage>,
    ): Map<String, Any?> {
        val item = mapValue(rawItem).orEmpty()
        val percent =
            asNumber(item["percent"] ?: 0) ?: run {
                errors += error("schema", "$label.percent must be numeric")
                0
            }
        return linkedMapOf(
            "enabled" to ((item["enabled"] as? Boolean) ?: false),
            "percent" to percent,
        )
    }

    private fun normalizeYamlRiskItem(rawItem: Any?): Map<String, Any?> {
        val item = mapValue(rawItem).orEmpty()
        val percent = asNumber(item["percent"] ?: 0) ?: 0
        return linkedMapOf(
            "enabled" to ((item["enabled"] as? Boolean) ?: false),
            "percent" to percent,
        )
    }

    private fun normalizeLogic(
        rawLogic: Any?,
        label: String,
        errors: MutableList<StrategyValidationMessage>,
    ): String? {
        val logic = rawLogic?.toString()?.trim()?.uppercase() ?: "AND"
        return if (logic == "AND" || logic == "OR") {
            logic
        } else {
            errors += error("schema", "$label logic must be AND or OR")
            null
        }
    }

    private fun renderYaml(value: Map<String, Any?>): String = yaml.dump(value).trimEnd()

    private fun defaultBuilderRisk(): Map<String, Any?> =
        linkedMapOf(
            "stopLoss" to linkedMapOf("enabled" to false, "percent" to 0),
            "takeProfit" to linkedMapOf("enabled" to false, "percent" to 0),
            "trailingStop" to linkedMapOf("enabled" to false, "percent" to 0),
        )

    private fun defaultNormalizedRisk(): Map<String, Any?> =
        linkedMapOf(
            "stop_loss" to linkedMapOf("enabled" to false, "percent" to 0),
            "take_profit" to linkedMapOf("enabled" to false, "percent" to 0),
            "trailing_stop" to linkedMapOf("enabled" to false, "percent" to 0),
        )

    private fun slugify(value: String): String =
        value
            .lowercase()
            .replace(Regex("[^a-z0-9]+"), "_")
            .trim('_')
            .ifBlank { "strategy" }

    private fun mapValue(value: Any?): Map<String, Any?>? {
        if (value !is Map<*, *>) {
            return null
        }
        return value.entries
            .associate { (key, nestedValue) ->
                key.toString() to nestedValue
            }.toMap(LinkedHashMap())
    }

    private fun listValue(value: Any?): List<Any?>? = value as? List<Any?>

    private fun asNumber(value: Any?): Number? =
        when (value) {
            is Number -> value
            is String -> value.toDoubleOrNull()
            else -> null
        }

    private fun error(
        category: String,
        message: String,
    ) = StrategyValidationMessage(category, message)

    private fun warning(
        category: String,
        message: String,
    ) = StrategyValidationMessage(category, message)

    private fun dumperOptions(): DumperOptions =
        DumperOptions().apply {
            defaultFlowStyle = DumperOptions.FlowStyle.BLOCK
            isPrettyFlow = true
            indent = 2
            indicatorIndent = 1
            width = 120
            splitLines = false
        }
}
