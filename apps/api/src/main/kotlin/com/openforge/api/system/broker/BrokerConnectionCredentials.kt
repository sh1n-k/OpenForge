package com.openforge.api.system.broker

import com.openforge.api.strategy.domain.OrderMode

data class BrokerConnectionCredentials(
    val targetMode: OrderMode,
    val appKey: String,
    val appSecret: String,
    val accountNumber: String,
    val productCode: String,
    val baseUrl: String,
)
