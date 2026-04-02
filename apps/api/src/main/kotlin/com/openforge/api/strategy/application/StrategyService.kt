package com.openforge.api.strategy.application

import com.openforge.api.strategy.domain.PayloadFormat
import com.openforge.api.strategy.domain.StrategyEntity
import com.openforge.api.strategy.domain.StrategyExecutionConfigRepository
import com.openforge.api.strategy.domain.StrategyRepository
import com.openforge.api.strategy.domain.StrategyStatus
import com.openforge.api.strategy.domain.StrategyType
import com.openforge.api.strategy.domain.StrategyUniverseEntity
import com.openforge.api.strategy.domain.StrategyUniverseRepository
import com.openforge.api.strategy.domain.StrategyValidationStatus
import com.openforge.api.strategy.domain.StrategyVersionEntity
import com.openforge.api.strategy.domain.StrategyVersionRepository
import com.openforge.api.strategy.domain.UniverseRepository
import com.openforge.api.strategy.editor.StrategyEditorService
import com.openforge.api.strategy.editor.StrategyValidationMessage
import com.openforge.api.strategy.web.CreateStrategyRequest
import com.openforge.api.strategy.web.StrategyDetailResponse
import com.openforge.api.strategy.web.StrategyPayloadRequest
import com.openforge.api.strategy.web.StrategySummaryResponse
import com.openforge.api.strategy.web.StrategyValidateRequest
import com.openforge.api.strategy.web.StrategyValidateResponse
import com.openforge.api.strategy.web.StrategyValidationMessageResponse
import com.openforge.api.strategy.web.StrategyVersionResponse
import com.openforge.api.strategy.web.UniverseReferenceResponse
import com.openforge.api.strategy.web.UpdateStrategyRequest
import jakarta.transaction.Transactional
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.util.LinkedHashMap
import java.util.UUID

@Service
@Transactional
class StrategyService(
    private val strategyRepository: StrategyRepository,
    private val strategyVersionRepository: StrategyVersionRepository,
    private val strategyUniverseRepository: StrategyUniverseRepository,
    private val universeRepository: UniverseRepository,
    private val strategyExecutionConfigRepository: StrategyExecutionConfigRepository,
    private val strategyEditorService: StrategyEditorService,
) {
    fun validate(request: StrategyValidateRequest): StrategyValidateResponse {
        val result =
            strategyEditorService.validate(
                com.openforge.api.strategy.editor.StrategyValidateCommand(
                    strategyType = request.strategyType,
                    payloadFormat = request.payloadFormat,
                    payload = request.payload,
                ),
            )
        return StrategyValidateResponse(
            valid = result.valid,
            normalizedSpec = result.normalizedSpec,
            yamlPreview = result.yamlPreview,
            errors = result.errors.map(::toMessageResponse),
            warnings = result.warnings.map(::toMessageResponse),
            summary = result.summary,
        )
    }

    fun listStrategies(): List<StrategySummaryResponse> =
        strategyRepository
            .findAllByIsArchivedFalseOrderByUpdatedAtDesc()
            .map(::toSummary)

    fun createStrategy(request: CreateStrategyRequest): StrategyDetailResponse {
        ensureUniqueStrategyName(request.name, null)

        val strategy =
            strategyRepository.save(
                StrategyEntity(
                    name = request.name.trim(),
                    description = request.description?.trim()?.ifBlank { null },
                    strategyType = request.strategyType,
                    status = StrategyStatus.DRAFT,
                ),
            )

        val version = createVersion(strategy.id, request.initialPayload)
        strategy.latestVersionId = version.id
        syncStrategyMetadataFromVersion(strategy, version)
        strategyRepository.save(strategy)

        return getStrategy(strategy.id)
    }

    fun getStrategy(strategyId: UUID): StrategyDetailResponse {
        val strategy = getActiveStrategy(strategyId)
        val versions =
            strategyVersionRepository
                .findAllByStrategyIdOrderByVersionNumberDesc(strategy.id)
                .map { ensureValidation(it, strategy.strategyType) }
        val linkedUniverseIds = strategyUniverseRepository.findAllByStrategyId(strategy.id).map { it.universeId }
        val universes =
            if (linkedUniverseIds.isEmpty()) {
                emptyList()
            } else {
                universeRepository
                    .findAllById(linkedUniverseIds)
                    .filter { !it.isArchived }
                    .map {
                        UniverseReferenceResponse(
                            id = it.id,
                            name = it.name,
                            description = it.description,
                        )
                    }.sortedBy { it.name.lowercase() }
            }

        return StrategyDetailResponse(
            id = strategy.id,
            name = strategy.name,
            description = strategy.description,
            strategyType = strategy.strategyType,
            status = strategy.status,
            latestVersionId = strategy.latestVersionId,
            latestVersionNumber = versions.firstOrNull()?.versionNumber,
            versionCount = versions.size.toLong(),
            universeCount = universes.size.toLong(),
            latestValidationStatus = versions.firstOrNull()?.validationStatus,
            latestValidationErrors =
                versions
                    .firstOrNull()
                    ?.validationErrors
                    ?.map(::toMessageResponse)
                    .orEmpty(),
            latestValidationWarnings =
                versions
                    .firstOrNull()
                    ?.validationWarnings
                    ?.map(::toMessageResponse)
                    .orEmpty(),
            latestVersion = versions.firstOrNull()?.let(::toVersionResponse),
            universes = universes,
            createdAt = strategy.createdAt,
            updatedAt = strategy.updatedAt,
        )
    }

    fun updateStrategy(
        strategyId: UUID,
        request: UpdateStrategyRequest,
    ): StrategyDetailResponse {
        val strategy = getActiveStrategy(strategyId)

        request.name?.trim()?.let { name ->
            if (name.isBlank()) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Strategy name cannot be blank")
            }
            ensureUniqueStrategyName(name, strategy.id)
            strategy.name = name
        }

        if (request.description != null) {
            strategy.description = request.description.trim().ifBlank { null }
        }

        request.status?.let { requestedStatus ->
            if (requestedStatus == StrategyStatus.RUNNING || requestedStatus == StrategyStatus.STOPPED) {
                throw ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Use execution settings to manage running and stopped statuses",
                )
            }
            strategy.status = requestedStatus
        }
        strategyRepository.save(strategy)
        return getStrategy(strategy.id)
    }

    fun appendStrategyVersion(
        strategyId: UUID,
        request: StrategyPayloadRequest,
    ): StrategyVersionResponse {
        val strategy = getActiveStrategy(strategyId)

        val version = createVersion(strategy.id, request)
        strategy.latestVersionId = version.id
        strategy.status = StrategyStatus.DRAFT
        strategyExecutionConfigRepository.findById(strategy.id).ifPresent {
            it.enabled = false
            strategyExecutionConfigRepository.save(it)
        }
        syncStrategyMetadataFromVersion(strategy, version)
        strategyRepository.save(strategy)

        return toVersionResponse(version)
    }

    fun listStrategyVersions(strategyId: UUID): List<StrategyVersionResponse> {
        val strategy = getActiveStrategy(strategyId)
        return strategyVersionRepository
            .findAllByStrategyIdOrderByVersionNumberDesc(strategyId)
            .map { ensureValidation(it, strategy.strategyType) }
            .map(::toVersionResponse)
    }

    fun cloneStrategy(strategyId: UUID): StrategyDetailResponse {
        val source = getActiveStrategy(strategyId)
        val latestVersion =
            source.latestVersionId?.let { strategyVersionRepository.findById(it).orElse(null) }
                ?: throw ResponseStatusException(HttpStatus.CONFLICT, "Strategy does not have a latest version")
        val validatedLatestVersion = ensureValidation(latestVersion, source.strategyType)

        val clone =
            strategyRepository.save(
                StrategyEntity(
                    name = nextCopyName(source.name),
                    description = source.description,
                    strategyType = source.strategyType,
                    status = StrategyStatus.DRAFT,
                ),
            )

        val clonedNormalizedSpec =
            validatedLatestVersion.normalizedSpec
                ?.let { renameNormalizedSpec(it, clone.name) }
        val clonedPayload = clonePayload(validatedLatestVersion, clonedNormalizedSpec, clone.name)

        val cloneVersion =
            strategyVersionRepository.save(
                StrategyVersionEntity(
                    strategyId = clone.id,
                    versionNumber = 1,
                    payloadFormat = validatedLatestVersion.payloadFormat,
                    payload = clonedPayload,
                    normalizedSpec = clonedNormalizedSpec,
                    validationStatus = validatedLatestVersion.validationStatus,
                    validationErrors = deepCopyMessages(validatedLatestVersion.validationErrors),
                    validationWarnings = deepCopyMessages(validatedLatestVersion.validationWarnings),
                    changeSummary = "Cloned from ${source.name}",
                ),
            )

        clone.latestVersionId = cloneVersion.id
        syncStrategyMetadataFromVersion(clone, cloneVersion)
        strategyRepository.save(clone)

        val universeLinks = strategyUniverseRepository.findAllByStrategyId(source.id)
        if (universeLinks.isNotEmpty()) {
            strategyUniverseRepository.saveAll(
                universeLinks.map {
                    StrategyUniverseEntity(
                        strategyId = clone.id,
                        universeId = it.universeId,
                    )
                },
            )
        }

        return getStrategy(clone.id)
    }

    fun archiveStrategy(strategyId: UUID) {
        val strategy = getActiveStrategy(strategyId)
        strategy.isArchived = true
        strategyRepository.save(strategy)
    }

    fun replaceStrategyUniverses(
        strategyId: UUID,
        universeIds: List<UUID>,
    ): StrategyDetailResponse {
        val strategy = getActiveStrategy(strategyId)
        val uniqueUniverseIds = universeIds.distinct()
        val universes =
            if (uniqueUniverseIds.isEmpty()) {
                emptyList()
            } else {
                universeRepository.findAllById(uniqueUniverseIds).filter { !it.isArchived }
            }

        if (universes.size != uniqueUniverseIds.size) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Universe contains archived or missing entries")
        }

        strategyUniverseRepository.deleteAllByStrategyId(strategy.id)
        if (uniqueUniverseIds.isNotEmpty()) {
            strategyUniverseRepository.saveAll(
                uniqueUniverseIds.map {
                    StrategyUniverseEntity(strategyId = strategy.id, universeId = it)
                },
            )
        }
        return getStrategy(strategy.id)
    }

    private fun createVersion(
        strategyId: UUID,
        request: StrategyPayloadRequest,
    ): StrategyVersionEntity {
        val strategy = getActiveStrategy(strategyId)
        val validation =
            strategyEditorService.validateOrThrow(
                com.openforge.api.strategy.editor.StrategyValidateCommand(
                    strategyType = strategy.strategyType,
                    payloadFormat = request.payloadFormat,
                    payload = request.payload,
                ),
            )
        val nextVersion = (strategyVersionRepository.findTopByStrategyIdOrderByVersionNumberDesc(strategyId)?.versionNumber ?: 0) + 1
        return strategyVersionRepository.save(
            StrategyVersionEntity(
                strategyId = strategyId,
                versionNumber = nextVersion,
                payloadFormat = request.payloadFormat,
                payload = deepCopyPayload(request.payload),
                normalizedSpec = validation.normalizedSpec?.let(::deepCopyPayload),
                validationStatus = validation.status,
                validationErrors = validation.errors.map(::toMessageMap),
                validationWarnings = validation.warnings.map(::toMessageMap),
                changeSummary = request.changeSummary?.trim()?.ifBlank { null },
            ),
        )
    }

    private fun nextCopyName(baseName: String): String {
        var candidate = "$baseName Copy"
        var suffix = 2
        while (strategyRepository.existsActiveByName(candidate, null)) {
            candidate = "$baseName Copy $suffix"
            suffix += 1
        }
        return candidate
    }

    private fun ensureUniqueStrategyName(
        name: String,
        excludeId: UUID?,
    ) {
        if (strategyRepository.existsActiveByName(name.trim(), excludeId)) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "An active strategy with the same name already exists")
        }
    }

    private fun getActiveStrategy(strategyId: UUID): StrategyEntity =
        strategyRepository.findByIdAndIsArchivedFalse(strategyId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Strategy not found: $strategyId")

    private fun toSummary(strategy: StrategyEntity): StrategySummaryResponse {
        val latestVersion =
            strategy.latestVersionId
                ?.let { strategyVersionRepository.findById(it).orElse(null) }
                ?.let { ensureValidation(it, strategy.strategyType) }
        return StrategySummaryResponse(
            id = strategy.id,
            name = strategy.name,
            description = strategy.description,
            strategyType = strategy.strategyType,
            status = strategy.status,
            latestVersionId = strategy.latestVersionId,
            latestVersionNumber = latestVersion?.versionNumber,
            versionCount = strategyVersionRepository.countByStrategyId(strategy.id),
            universeCount = strategyUniverseRepository.countByStrategyId(strategy.id),
            updatedAt = strategy.updatedAt,
        )
    }

    private fun toVersionResponse(version: StrategyVersionEntity): StrategyVersionResponse =
        StrategyVersionResponse(
            id = version.id,
            versionNumber = version.versionNumber,
            payloadFormat = version.payloadFormat,
            payload = version.payload,
            validationStatus = version.validationStatus,
            validationErrors = version.validationErrors.map(::toMessageResponse),
            validationWarnings = version.validationWarnings.map(::toMessageResponse),
            changeSummary = version.changeSummary,
            createdAt = version.createdAt,
        )

    private fun ensureValidation(
        version: StrategyVersionEntity,
        strategyType: StrategyType,
    ): StrategyVersionEntity {
        if (version.normalizedSpec != null && version.validationStatus != StrategyValidationStatus.INVALID_LEGACY_DRAFT) {
            return version
        }

        val result = strategyEditorService.validateStoredPayload(strategyType, version.payloadFormat, version.payload)
        version.validationStatus =
            if (result.valid) {
                StrategyValidationStatus.VALID
            } else if (version.normalizedSpec == null) {
                StrategyValidationStatus.INVALID_LEGACY_DRAFT
            } else {
                StrategyValidationStatus.INVALID
            }
        version.normalizedSpec = result.normalizedSpec?.let(::deepCopyPayload)
        version.validationErrors = result.errors.map(::toMessageMap)
        version.validationWarnings = result.warnings.map(::toMessageMap)
        return strategyVersionRepository.save(version)
    }

    private fun syncStrategyMetadataFromVersion(
        strategy: StrategyEntity,
        version: StrategyVersionEntity,
    ) {
        val metadata = version.normalizedSpec?.get("metadata") as? Map<*, *> ?: return
        val normalizedName = metadata["name"]?.toString()?.trim().takeUnless { it.isNullOrBlank() } ?: return
        val normalizedDescription = metadata["description"]?.toString()?.trim().orEmpty()
        if (strategy.name != normalizedName) {
            ensureUniqueStrategyName(normalizedName, strategy.id)
            strategy.name = normalizedName
        }
        strategy.description = normalizedDescription.ifBlank { null }
    }

    private fun clonePayload(
        version: StrategyVersionEntity,
        clonedNormalizedSpec: Map<String, Any?>?,
        cloneName: String,
    ): Map<String, Any?> =
        when (version.payloadFormat) {
            PayloadFormat.BUILDER_JSON -> {
                val payload = deepCopyPayload(version.payload).toMutableMap()
                val builderState =
                    (payload["builderState"] as? Map<*, *>)
                        ?.entries
                        ?.associate { it.key.toString() to deepCopyValue(it.value) }
                        ?.toMutableMap()
                        ?: linkedMapOf()
                val metadata =
                    (builderState["metadata"] as? Map<*, *>)
                        ?.entries
                        ?.associate { it.key.toString() to deepCopyValue(it.value) }
                        ?.toMutableMap()
                        ?: linkedMapOf()
                metadata["name"] = cloneName
                metadata["id"] = slugify(cloneName)
                builderState["metadata"] = metadata
                payload["builderState"] = builderState
                payload.toMap(LinkedHashMap())
            }

            PayloadFormat.CODE_TEXT ->
                linkedMapOf(
                    "source" to strategyEditorService.renderNormalizedSpec(clonedNormalizedSpec ?: emptyMap()),
                    "sourceKind" to "openforge_yaml",
                )
        }

    private fun renameNormalizedSpec(
        normalizedSpec: Map<String, Any?>,
        cloneName: String,
    ): Map<String, Any?> {
        val copy = deepCopyPayload(normalizedSpec).toMutableMap()
        val metadata =
            (copy["metadata"] as? Map<*, *>)
                ?.entries
                ?.associate { it.key.toString() to deepCopyValue(it.value) }
                ?.toMutableMap()
                ?: linkedMapOf()
        metadata["name"] = cloneName
        copy["metadata"] = metadata

        val strategy =
            (copy["strategy"] as? Map<*, *>)
                ?.entries
                ?.associate { it.key.toString() to deepCopyValue(it.value) }
                ?.toMutableMap()
                ?: linkedMapOf()
        strategy["id"] = slugify(cloneName)
        copy["strategy"] = strategy
        return copy.toMap(LinkedHashMap())
    }

    @Suppress("UNCHECKED_CAST")
    private fun deepCopyPayload(payload: Map<String, Any?>): Map<String, Any?> =
        payload
            .mapValues { (_, value) -> deepCopyValue(value) }
            .toMap(LinkedHashMap())

    private fun deepCopyMessages(messages: List<Map<String, String>>): List<Map<String, String>> =
        messages.map {
            linkedMapOf(
                "category" to (it["category"] ?: ""),
                "message" to (it["message"] ?: ""),
            )
        }

    @Suppress("UNCHECKED_CAST")
    private fun deepCopyValue(value: Any?): Any? =
        when (value) {
            is Map<*, *> ->
                value.entries
                    .associate { (key, nestedValue) ->
                        key.toString() to deepCopyValue(nestedValue)
                    }.toMap(LinkedHashMap())
            is List<*> -> value.map(::deepCopyValue)
            else -> value
        }

    private fun slugify(value: String): String =
        value
            .lowercase()
            .replace(Regex("[^a-z0-9]+"), "_")
            .trim('_')
            .ifBlank { "strategy" }

    private fun toMessageMap(message: StrategyValidationMessage): Map<String, String> =
        linkedMapOf(
            "category" to message.category,
            "message" to message.message,
        )

    private fun toMessageResponse(message: StrategyValidationMessage): StrategyValidationMessageResponse =
        StrategyValidationMessageResponse(
            category = message.category,
            message = message.message,
        )

    private fun toMessageResponse(message: Map<String, String>): StrategyValidationMessageResponse =
        StrategyValidationMessageResponse(
            category = message["category"].orEmpty(),
            message = message["message"].orEmpty(),
        )
}
