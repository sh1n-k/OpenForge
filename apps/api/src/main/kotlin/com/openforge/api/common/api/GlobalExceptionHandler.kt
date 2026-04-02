package com.openforge.api.common.api

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.http.HttpStatusCode
import org.springframework.http.ProblemDetail
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.AuthenticationException
import org.springframework.web.ErrorResponseException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.time.OffsetDateTime

@RestControllerAdvice
class GlobalExceptionHandler {
    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDenied(
        exception: AccessDeniedException,
        request: HttpServletRequest,
    ): ProblemDetail =
        buildProblemDetail(
            status = HttpStatus.FORBIDDEN,
            title = "Forbidden",
            detail = exception.message ?: "Access denied.",
            path = request.requestURI,
        )

    @ExceptionHandler(AuthenticationException::class)
    fun handleAuthentication(
        exception: AuthenticationException,
        request: HttpServletRequest,
    ): ProblemDetail =
        buildProblemDetail(
            status = HttpStatus.UNAUTHORIZED,
            title = "Unauthorized",
            detail = exception.message ?: "Authentication required.",
            path = request.requestURI,
        )

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(
        exception: IllegalArgumentException,
        request: HttpServletRequest,
    ): ProblemDetail =
        buildProblemDetail(
            status = HttpStatus.BAD_REQUEST,
            title = "Invalid request",
            detail = exception.message ?: "The request could not be processed.",
            path = request.requestURI,
        )

    @ExceptionHandler(ErrorResponseException::class)
    fun handleErrorResponse(
        exception: ErrorResponseException,
        request: HttpServletRequest,
    ): ProblemDetail =
        buildProblemDetail(
            status = resolveStatus(exception.statusCode),
            title = resolveStatus(exception.statusCode).reasonPhrase,
            detail = exception.body.detail ?: (exception.message ?: "The request could not be processed."),
            path = request.requestURI,
        )

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(
        exception: Exception,
        request: HttpServletRequest,
    ): ProblemDetail =
        buildProblemDetail(
            status = HttpStatus.INTERNAL_SERVER_ERROR,
            title = "Bootstrap error",
            detail = exception.message ?: "An unexpected error occurred during bootstrap.",
            path = request.requestURI,
        )

    private fun buildProblemDetail(
        status: HttpStatus,
        title: String,
        detail: String,
        path: String,
    ): ProblemDetail {
        val problemDetail = ProblemDetail.forStatusAndDetail(status, detail)
        problemDetail.title = title
        problemDetail.setProperty("path", path)
        problemDetail.setProperty("timestamp", OffsetDateTime.now())
        return problemDetail
    }

    private fun resolveStatus(statusCode: HttpStatusCode): HttpStatus = HttpStatus.valueOf(statusCode.value())
}
