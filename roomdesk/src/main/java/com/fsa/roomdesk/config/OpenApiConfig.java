package com.fsa.roomdesk.config;

import com.fsa.roomdesk.exception.ProblemType;
import com.fsa.roomdesk.web.ApiProblems;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.models.media.ArraySchema;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@OpenAPIDefinition(
        info = @Info(title = "RoomDesk Meeting Room Booking API", version = "1.0.0"),
        security = @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME))
@SecurityScheme(
        name = OpenApiConfig.BEARER_SCHEME,
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT")
public class OpenApiConfig {

    public static final String BEARER_SCHEME = "bearerAuth";
    private static final String PROBLEM_SCHEMA = "Problem";

    /** Registers the RFC 9457 problem schema used by every error response. */
    @Bean
    OpenApiCustomizer problemSchemaCustomizer() {
        return openApi -> {
            Schema<?> fieldError = new ObjectSchema()
                    .addProperty("field", new StringSchema())
                    .addProperty("message", new StringSchema());
            Schema<?> problem = new ObjectSchema()
                    .description("RFC 9457 problem details")
                    .addProperty("type", new StringSchema().format("uri")
                            .example(ProblemType.BASE_URI + "validation"))
                    .addProperty("title", new StringSchema())
                    .addProperty("status", new IntegerSchema())
                    .addProperty("detail", new StringSchema())
                    .addProperty("instance", new StringSchema().format("uri-reference"))
                    .addProperty("errors", new ArraySchema().items(fieldError)
                            .description("Only for " + ProblemType.BASE_URI + "validation"));
            openApi.getComponents().addSchemas(PROBLEM_SCHEMA, problem);
            // The health probe is public.
            var health = openApi.getPaths() == null ? null : openApi.getPaths().get("/actuator/health");
            if (health != null && health.getGet() != null) {
                health.getGet().setSecurity(List.of());
                health.getGet().getResponses().addApiResponse("503",
                        new ApiResponse().description("DOWN: the database is not reachable"));
            }
        };
    }

    /** Adds the error responses listed in {@link ApiProblems} to each operation. */
    @Bean
    OperationCustomizer problemResponsesCustomizer() {
        return (operation, handlerMethod) -> {
            var annotation = handlerMethod.getMethodAnnotation(ApiProblems.class);
            if (annotation == null) {
                return operation;
            }
            Map<Integer, List<ProblemType>> byStatus = Arrays.stream(annotation.value())
                    .collect(Collectors.groupingBy(t -> t.status().value(), TreeMap::new, Collectors.toList()));
            if (operation.getResponses() == null) {
                operation.setResponses(new ApiResponses());
            }
            var content = new Content().addMediaType(org.springframework.http.MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                    new MediaType().schema(new Schema<>().$ref("#/components/schemas/" + PROBLEM_SCHEMA)));
            Map<String, ApiResponse> responses = new LinkedHashMap<>();
            byStatus.forEach((status, types) -> responses.put(String.valueOf(status), new ApiResponse()
                    .description(types.stream()
                            .map(t -> t.title() + " (" + ProblemType.BASE_URI + t.slug() + ")")
                            .collect(Collectors.joining("; ")))
                    .content(content)));
            responses.forEach(operation.getResponses()::addApiResponse);
            return operation;
        };
    }
}
