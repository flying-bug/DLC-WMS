package com.fsa.roomdesk.service;

/** The authenticated user making the current request. */
public record Caller(String email, boolean admin) {
}
