package com.openforge.api.strategy

import com.openforge.api.strategy.application.StrategyService
import com.openforge.api.strategy.application.UniverseService
import com.openforge.api.strategy.domain.MarketType
import com.openforge.api.strategy.domain.PayloadFormat
import com.openforge.api.strategy.domain.StrategyEntity
import com.openforge.api.strategy.domain.StrategyRepository
import com.openforge.api.strategy.domain.StrategyType
import com.openforge.api.strategy.domain.StrategyVersionEntity
import com.openforge.api.strategy.domain.StrategyVersionRepository
import com.openforge.api.strategy.web.CreateStrategyRequest
import com.openforge.api.strategy.web.CreateUniverseRequest
import com.openforge.api.strategy.web.StrategyPayloadRequest
import com.openforge.api.support.PostgresIntegrationTestSupport
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired

class StrategyServiceIntegrationTest : PostgresIntegrationTestSupport() {
    @Autowired
    lateinit var strategyService: StrategyService

    @Autowired
    lateinit var universeService: UniverseService

    @Autowired
    lateinit var strategyRepository: StrategyRepository

    @Autowired
    lateinit var strategyVersionRepository: StrategyVersionRepository

    @Test
    fun `appends version with sequential number`() {
        val created =
            strategyService.createStrategy(
                CreateStrategyRequest(
                    name = "Versioned Strategy",
                    description = null,
                    strategyType = StrategyType.CODE,
                    initialPayload =
                        StrategyPayloadRequest(
                            payloadFormat = PayloadFormat.CODE_TEXT,
                            payload = validCodePayload("Versioned Strategy", 5),
                            changeSummary = "initial",
                        ),
                ),
            )

        val second =
            strategyService.appendStrategyVersion(
                created.id,
                StrategyPayloadRequest(
                    payloadFormat = PayloadFormat.CODE_TEXT,
                    payload = validCodePayload("Versioned Strategy", 7),
                    changeSummary = "second",
                ),
            )

        assertEquals(2, second.versionNumber)
        assertEquals("valid", second.validationStatus.value)
        assertEquals(2, strategyService.getStrategy(created.id).latestVersionNumber)
    }

    @Test
    fun `clones latest payload and universe links with draft status`() {
        val universe =
            universeService.createUniverse(
                CreateUniverseRequest(name = "Core KR", marketScope = MarketType.DOMESTIC, description = null),
            )
        universeService.replaceSymbols(
            universe.id,
            listOf(),
        )

        val created =
            strategyService.createStrategy(
                CreateStrategyRequest(
                    name = "Clone Source",
                    description = "src",
                    strategyType = StrategyType.BUILDER,
                    initialPayload =
                        StrategyPayloadRequest(
                            payloadFormat = PayloadFormat.BUILDER_JSON,
                            payload = validBuilderPayload("Clone Source", listOf("sma_fast" to 5)),
                            changeSummary = "initial",
                        ),
                ),
            )

        strategyService.replaceStrategyUniverses(created.id, listOf(universe.id))
        strategyService.appendStrategyVersion(
            created.id,
            StrategyPayloadRequest(
                payloadFormat = PayloadFormat.BUILDER_JSON,
                payload = validBuilderPayload("Clone Source", listOf("sma_fast" to 5, "ema_slow" to 20)),
                changeSummary = "second",
            ),
        )

        val clone = strategyService.cloneStrategy(created.id)

        assertEquals("draft", clone.status.value)
        assertEquals(1, clone.latestVersionNumber)
        assertEquals(1, clone.universeCount)
        assertEquals("Clone Source Copy", clone.name)
        val builderState = clone.latestVersion?.payload?.get("builderState") as Map<*, *>
        val indicators = builderState["indicators"] as List<*>
        assertEquals(2, indicators.size)
        assertEquals("valid", clone.latestVersion?.validationStatus?.value)
    }

    @Test
    fun `marks invalid legacy payload on lazy normalization`() {
        val strategy =
            strategyRepository.save(
                StrategyEntity(
                    name = "Legacy Builder",
                    description = "legacy",
                    strategyType = StrategyType.BUILDER,
                ),
            )
        val version =
            strategyVersionRepository.save(
                StrategyVersionEntity(
                    strategyId = strategy.id,
                    versionNumber = 1,
                    payloadFormat = PayloadFormat.BUILDER_JSON,
                    payload =
                        mapOf(
                            "builderState" to mapOf("nodes" to emptyList<String>()),
                            "metadata" to mapOf("name" to "Legacy Builder"),
                        ),
                ),
            )
        strategy.latestVersionId = version.id
        strategyRepository.save(strategy)

        val detail = strategyService.getStrategy(strategy.id)

        assertEquals("invalid_legacy_draft", detail.latestValidationStatus?.value)
        assertTrue(detail.latestValidationErrors.isNotEmpty())
    }

    private fun validBuilderPayload(
        name: String,
        indicators: List<Pair<String, Int>>,
    ) = mapOf(
        "builderState" to
            mapOf(
                "metadata" to
                    mapOf(
                        "id" to name.lowercase().replace(" ", "_"),
                        "name" to name,
                        "description" to "builder",
                        "category" to "custom",
                        "author" to "OpenForge",
                        "tags" to listOf("builder"),
                    ),
                "indicators" to
                    indicators.map { (alias, period) ->
                        mapOf(
                            "indicatorId" to if (alias.startsWith("ema")) "ema" else "sma",
                            "alias" to alias,
                            "params" to mapOf("period" to period),
                            "output" to "value",
                        )
                    },
                "entry" to mapOf("logic" to "AND", "conditions" to emptyList<Map<String, Any?>>()),
                "exit" to mapOf("logic" to "AND", "conditions" to emptyList<Map<String, Any?>>()),
                "risk" to
                    mapOf(
                        "stopLoss" to mapOf("enabled" to false, "percent" to 0),
                        "takeProfit" to mapOf("enabled" to false, "percent" to 0),
                        "trailingStop" to mapOf("enabled" to false, "percent" to 0),
                    ),
            ),
    )

    private fun validCodePayload(
        name: String,
        period: Int,
    ) = mapOf(
        "source" to
            """
            version: "1.0"
            metadata:
              name: "$name"
              description: "code strategy"
              author: "OpenForge"
              tags: ["code"]
            strategy:
              id: "${name.lowercase().replace(" ", "_")}"
              category: "custom"
              indicators:
                - id: "sma"
                  alias: "sma_fast"
                  params:
                    period: $period
                  output: "value"
              entry:
                logic: "AND"
                conditions: []
              exit:
                logic: "AND"
                conditions: []
            risk:
              stop_loss:
                enabled: false
                percent: 0
              take_profit:
                enabled: false
                percent: 0
              trailing_stop:
                enabled: false
                percent: 0
            """.trimIndent(),
        "sourceKind" to "openforge_yaml",
    )
}
