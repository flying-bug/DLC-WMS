package com.fsa.roomdesk.web;

import com.fsa.roomdesk.exception.ProblemType;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * The error responses an endpoint really returns. Read by {@code OpenApiConfig} to document
 * them in the OpenAPI contract as application/problem+json responses.
 */
@Documented
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface ApiProblems {

    ProblemType[] value();
}
