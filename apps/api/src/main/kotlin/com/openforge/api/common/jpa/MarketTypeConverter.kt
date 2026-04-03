package com.openforge.api.common.jpa

import com.openforge.api.strategy.domain.MarketType
import jakarta.persistence.AttributeConverter
import jakarta.persistence.Converter

@Converter(autoApply = true)
class MarketTypeConverter : AttributeConverter<MarketType, String> {
    override fun convertToDatabaseColumn(attribute: MarketType?): String? = attribute?.value

    override fun convertToEntityAttribute(dbData: String?): MarketType? =
        dbData
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?.let(MarketType::fromValue)
}
