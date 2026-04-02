package com.openforge.api

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
class OpenForgeApiApplication

fun main(args: Array<String>) {
    runApplication<OpenForgeApiApplication>(*args)
}
