package com.openforge.api.strategy.application

import com.openforge.api.strategy.domain.StrategyUniverseRepository
import com.openforge.api.strategy.domain.UniverseEntity
import com.openforge.api.strategy.domain.UniverseRepository
import com.openforge.api.strategy.domain.UniverseSymbolEntity
import com.openforge.api.strategy.domain.UniverseSymbolRepository
import com.openforge.api.strategy.web.CreateUniverseRequest
import com.openforge.api.strategy.web.UniverseDetailResponse
import com.openforge.api.strategy.web.UniverseSummaryResponse
import com.openforge.api.strategy.web.UniverseSymbolInput
import com.openforge.api.strategy.web.UniverseSymbolResponse
import com.openforge.api.strategy.web.UpdateUniverseRequest
import jakarta.transaction.Transactional
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@Service
@Transactional
class UniverseService(
    private val universeRepository: UniverseRepository,
    private val universeSymbolRepository: UniverseSymbolRepository,
    private val strategyUniverseRepository: StrategyUniverseRepository,
) {
    fun listUniverses(): List<UniverseSummaryResponse> =
        universeRepository
            .findAllByIsArchivedFalseOrderByUpdatedAtDesc()
            .map(::toSummary)

    fun createUniverse(request: CreateUniverseRequest): UniverseDetailResponse {
        ensureUniqueUniverseName(request.name, null)
        val universe =
            universeRepository.save(
                UniverseEntity(
                    name = request.name.trim(),
                    description = request.description?.trim()?.ifBlank { null },
                ),
            )
        return getUniverse(universe.id)
    }

    fun getUniverse(universeId: UUID): UniverseDetailResponse {
        val universe = getActiveUniverse(universeId)
        val symbols = universeSymbolRepository.findAllByUniverseIdOrderBySortOrderAscSymbolAsc(universe.id)
        return UniverseDetailResponse(
            id = universe.id,
            name = universe.name,
            description = universe.description,
            symbolCount = symbols.size.toLong(),
            strategyCount = strategyUniverseRepository.countByUniverseId(universe.id),
            symbols =
                symbols.map {
                    UniverseSymbolResponse(
                        symbol = it.symbol,
                        market = it.market,
                        displayName = it.displayName,
                        sortOrder = it.sortOrder,
                    )
                },
            createdAt = universe.createdAt,
            updatedAt = universe.updatedAt,
        )
    }

    fun updateUniverse(
        universeId: UUID,
        request: UpdateUniverseRequest,
    ): UniverseDetailResponse {
        val universe = getActiveUniverse(universeId)

        request.name?.trim()?.let { name ->
            if (name.isBlank()) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Universe name cannot be blank")
            }
            ensureUniqueUniverseName(name, universe.id)
            universe.name = name
        }

        if (request.description != null) {
            universe.description = request.description.trim().ifBlank { null }
        }

        universeRepository.save(universe)
        return getUniverse(universe.id)
    }

    fun replaceSymbols(
        universeId: UUID,
        inputs: List<UniverseSymbolInput>,
    ): UniverseDetailResponse {
        val universe = getActiveUniverse(universeId)
        val normalized =
            inputs
                .mapIndexed { index, input ->
                    UniverseSymbolEntity(
                        universeId = universe.id,
                        symbol = input.symbol.trim(),
                        market = input.market,
                        displayName = input.displayName.trim(),
                        sortOrder = input.sortOrder.takeIf { it >= 0 } ?: index,
                    )
                }

        if (normalized.any { it.symbol.isBlank() || it.displayName.isBlank() }) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Universe symbols require symbol and displayName")
        }

        if (normalized.map { it.symbol }.distinct().size != normalized.size) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Universe symbols must be unique")
        }

        universeSymbolRepository.deleteAllByUniverseId(universe.id)
        universeSymbolRepository.saveAll(normalized)
        return getUniverse(universe.id)
    }

    fun archiveUniverse(universeId: UUID) {
        val universe = getActiveUniverse(universeId)
        universe.isArchived = true
        universeRepository.save(universe)
    }

    private fun ensureUniqueUniverseName(
        name: String,
        excludeId: UUID?,
    ) {
        if (universeRepository.existsActiveByName(name.trim(), excludeId)) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "An active universe with the same name already exists")
        }
    }

    private fun getActiveUniverse(universeId: UUID): UniverseEntity =
        universeRepository.findByIdAndIsArchivedFalse(universeId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Universe not found: $universeId")

    private fun toSummary(universe: UniverseEntity): UniverseSummaryResponse =
        UniverseSummaryResponse(
            id = universe.id,
            name = universe.name,
            description = universe.description,
            symbolCount = universeSymbolRepository.countByUniverseId(universe.id),
            strategyCount = strategyUniverseRepository.countByUniverseId(universe.id),
            updatedAt = universe.updatedAt,
        )
}
