package com.openforge.api.strategy.application

import com.openforge.api.strategy.domain.StrategyUniverseRepository
import com.openforge.api.strategy.domain.UniverseEntity
import com.openforge.api.strategy.domain.MarketType
import com.openforge.api.strategy.domain.UniverseRepository
import com.openforge.api.strategy.domain.UniverseSymbolEntity
import com.openforge.api.strategy.domain.UniverseSymbolRepository
import com.openforge.api.symbol.SymbolMasterRepository
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
    private val symbolMasterRepository: SymbolMasterRepository,
) {
    fun listUniverses(marketScope: MarketType? = null): List<UniverseSummaryResponse> =
        (marketScope?.let { universeRepository.findAllByMarketScopeAndIsArchivedFalseOrderByUpdatedAtDesc(it) }
            ?: universeRepository.findAllByIsArchivedFalseOrderByUpdatedAtDesc())
            .map(::toSummary)

    fun createUniverse(request: CreateUniverseRequest): UniverseDetailResponse {
        ensureUniqueUniverseName(request.name, null)
        val universe =
            universeRepository.save(
                UniverseEntity(
                    name = request.name.trim(),
                    marketScope = request.marketScope,
                    description = request.description?.trim()?.ifBlank { null },
                ),
            )
        return getUniverse(universe.id)
    }

    fun getUniverse(universeId: UUID): UniverseDetailResponse {
        val universe = getActiveUniverse(universeId)
        val symbols = universeSymbolRepository.findAllByUniverseIdOrderBySortOrderAscSymbolAscExchangeAsc(universe.id)
        return UniverseDetailResponse(
            id = universe.id,
            name = universe.name,
            description = universe.description,
            marketScope = universe.marketScope,
            symbolCount = symbols.size.toLong(),
            strategyCount = strategyUniverseRepository.countByUniverseId(universe.id),
            symbols =
                symbols.map {
                    UniverseSymbolResponse(
                        symbol = it.symbol,
                        market = it.market,
                        exchange = it.exchange,
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
                    val normalizedSymbol = input.symbol.trim().uppercase()
                    val normalizedExchange = input.exchange.trim().lowercase()
                    val normalizedDisplayName = input.displayName.trim()
                    if (normalizedSymbol.isBlank() || normalizedExchange.isBlank() || normalizedDisplayName.isBlank()) {
                        throw ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Universe symbols require symbol, exchange, and displayName",
                        )
                    }
                    if (input.market != universe.marketScope) {
                        throw ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Universe symbols must match the universe market scope",
                        )
                    }
                    if (
                        !symbolMasterRepository.existsByMarketScopeAndExchangeAndCode(
                            universe.marketScope.value,
                            normalizedExchange,
                            normalizedSymbol,
                        )
                    ) {
                        throw ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Unknown symbol for ${universe.marketScope.value}: $normalizedExchange/$normalizedSymbol",
                        )
                    }
                    UniverseSymbolEntity(
                        universeId = universe.id,
                        symbol = normalizedSymbol,
                        market = input.market,
                        exchange = normalizedExchange,
                        displayName = normalizedDisplayName,
                        sortOrder = input.sortOrder.takeIf { it >= 0 } ?: index,
                    )
                }

        if (normalized.map { "${it.symbol}:${it.exchange}" }.distinct().size != normalized.size) {
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
            marketScope = universe.marketScope,
            symbolCount = universeSymbolRepository.countByUniverseId(universe.id),
            strategyCount = strategyUniverseRepository.countByUniverseId(universe.id),
            updatedAt = universe.updatedAt,
        )
}
