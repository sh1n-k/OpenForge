package com.openforge.api.strategy.web

import com.openforge.api.strategy.application.UniverseService
import com.openforge.api.strategy.domain.MarketType
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/v1/universes")
class UniverseController(
    private val universeService: UniverseService,
) {
    @GetMapping
    fun list(
        @RequestParam(required = false) marketScope: String?,
    ): List<UniverseSummaryResponse> =
        universeService.listUniverses(
            marketScope?.let { parseMarketScope(it) },
        )

    @PostMapping
    fun create(
        @Valid @RequestBody request: CreateUniverseRequest,
    ): UniverseDetailResponse = universeService.createUniverse(request)

    @GetMapping("/{universeId}")
    fun detail(
        @PathVariable universeId: UUID,
    ): UniverseDetailResponse = universeService.getUniverse(universeId)

    @PatchMapping("/{universeId}")
    fun update(
        @PathVariable universeId: UUID,
        @Valid @RequestBody request: UpdateUniverseRequest,
    ): UniverseDetailResponse = universeService.updateUniverse(universeId, request)

    @PutMapping("/{universeId}/symbols")
    fun replaceSymbols(
        @PathVariable universeId: UUID,
        @Valid @RequestBody request: ReplaceUniverseSymbolsRequest,
    ): UniverseDetailResponse = universeService.replaceSymbols(universeId, request.symbols)

    @DeleteMapping("/{universeId}")
    fun archive(
        @PathVariable universeId: UUID,
    ) {
        universeService.archiveUniverse(universeId)
    }

    private fun parseMarketScope(value: String): MarketType =
        try {
            MarketType.fromValue(value)
        } catch (exception: IllegalArgumentException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, exception.message, exception)
        }
}
