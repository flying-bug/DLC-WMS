package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.AiChatLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiChatLogRepository extends JpaRepository<AiChatLog, Long> {

    @Query(value = "SELECT question, COUNT(*) as q_count FROM ai_chat_logs GROUP BY question ORDER BY q_count DESC LIMIT 10", nativeQuery = true)
    List<Object[]> findTopQuestions();
}
