package com.openforge.api.config

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertDoesNotThrow
import org.junit.jupiter.api.assertThrows

class ApplicationPropertiesTest {
    @Test
    fun `local environment allows blank jwt secret`() {
        assertDoesNotThrow {
            ApplicationProperties(environment = "local", auth = AuthProperties(jwtSecret = ""))
        }
    }

    @Test
    fun `test environment allows blank jwt secret`() {
        assertDoesNotThrow {
            ApplicationProperties(environment = "test", auth = AuthProperties(jwtSecret = ""))
        }
    }

    @Test
    fun `production environment requires non-blank jwt secret`() {
        assertThrows<IllegalArgumentException> {
            ApplicationProperties(environment = "production", auth = AuthProperties(jwtSecret = ""))
        }
    }

    @Test
    fun `production environment starts with valid jwt secret`() {
        assertDoesNotThrow {
            ApplicationProperties(environment = "production", auth = AuthProperties(jwtSecret = "my-secret"))
        }
    }

    @Test
    fun `non-standard environment requires jwt secret`() {
        assertThrows<IllegalArgumentException> {
            ApplicationProperties(environment = "staging", auth = AuthProperties(jwtSecret = "   "))
        }
    }
}
