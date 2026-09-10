package com.duylongtech.backend.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import com.duylongtech.backend.enums.AuditAction;

/**
 * Annotation used to mark methods for automatic audit logging.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {
    AuditAction action();
    String entityName();
    String actionDescription();
}
