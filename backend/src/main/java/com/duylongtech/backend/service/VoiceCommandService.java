package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.VoiceCommandResponse;
import com.duylongtech.backend.constant.SystemMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public interface VoiceCommandService {
    VoiceCommandResponse parseVoiceCommand(String transcript);
}
