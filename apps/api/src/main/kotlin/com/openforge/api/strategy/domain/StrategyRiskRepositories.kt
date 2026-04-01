package com.openforge.api.strategy.domain

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface StrategyRiskConfigRepository : JpaRepository<StrategyRiskConfigEntity, UUID>

interface StrategyRiskEventRepository : JpaRepository<StrategyRiskEventEntity, UUID> {
    fun findAllByStrategyIdOrderByOccurredAtDesc(strategyId: UUID, pageable: Pageable): List<StrategyRiskEventEntity>
}
