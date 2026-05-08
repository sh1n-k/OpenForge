package com.openforge.api.config

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

@Controller
class SpaForwardController {
    @GetMapping(
        value = [
            "/",
            "/{path:^(?!api|actuator|assets|favicon\\.ico|.*\\..*$).*$}",
            "/{path:^(?!api|actuator|assets|favicon\\.ico|.*\\..*$).*$}/**",
        ],
    )
    fun forward(): String = "forward:/index.html"
}
