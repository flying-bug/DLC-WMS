package com.fsa.roomdesk.web;

import com.fsa.roomdesk.service.Caller;
import org.springframework.security.core.Authentication;

final class Callers {

    private Callers() {
    }

    static Caller from(Authentication authentication) {
        boolean admin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        return new Caller(authentication.getName(), admin);
    }
}
