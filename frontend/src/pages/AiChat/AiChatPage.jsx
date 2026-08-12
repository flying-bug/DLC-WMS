import { useMemo, useRef, useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import AdminLayout from '../../components/layout/AdminLayout';
import styles from './AiChatPage.module.css';
import { formatTime } from '../../utils/dateFormat';

const suggestedPrompts = [
    'Tồn kho hiện tại của sản phẩm nào đang thấp?',
    'Tóm tắt phiếu sửa chữa đang chờ xử lý',
    'Hướng dẫn tạo phiếu chuyển kho',
    'Tìm đơn bảo hành theo số serial'
];

const initialMessages = [
    {
        id: 1,
        role: 'assistant',
        content: 'Xin chào, tôi là trợ lý AI của DLC WMS. Bạn có thể hỏi về tồn kho, phiếu nhập xuất, bảo hành, sửa chữa hoặc quy trình vận hành.',
        time: '09:00'
    }
];

function buildErrorReply(error) {
    if (!error.response) {
        return 'Chưa kết nối được backend. Hãy kiểm tra backend Spring Boot đã chạy ở port 8080 chưa, rồi thử lại.';
    }

    if (error.response.status === 401) {
        return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Hãy đăng nhập lại rồi hỏi tiếp.';
    }

    const userMessage = error.response.data?.userMessage || error.response.data?.message;
    if (userMessage) {
        return `Backend trả về lỗi: ${userMessage}`;
    }

    return `Backend đang lỗi ${error.response.status}. Hãy xem log Spring Boot để biết chi tiết.`;
}

function formatSource(source) {
    if (!source?.name) return null;

    if (source.type === 'model_status' && source.description) {
        return `${source.name} (${source.description})`;
    }

    return source.name;
}

function AiChatPage() {
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem('dlc_ai_chat_history');
        return saved ? JSON.parse(saved) : initialMessages;
    });
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [prompts, setPrompts] = useState(suggestedPrompts);
    const textareaRef = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    };

    useEffect(() => {
        scrollToBottom();
        localStorage.setItem('dlc_ai_chat_history', JSON.stringify(messages));
    }, [messages, isThinking]);

    useEffect(() => {
        axiosClient.get('/ai/insights/frequent-questions')
            .then(res => {
                const data = res.data?.data || [];
                if (data.length > 0) {
                    setPrompts(data.slice(0, 4));
                }
            })
            .catch(err => console.error('Failed to load frequent questions:', err));
    }, []);

    const clearHistory = () => {
        setMessages(initialMessages);
        localStorage.removeItem('dlc_ai_chat_history');
    };

    const canSend = input.trim().length > 0 && !isThinking;

    const currentTime = useMemo(() => {
        return formatTime();
    }, []);

    const sendMessage = (value = input) => {
        const question = value.trim();
        if (!question || isThinking) return;

        setMessages((prev) => [
            ...prev,
            {
                id: Date.now(),
                role: 'user',
                content: question,
                time: currentTime
            }
        ]);
        setInput('');
        setIsThinking(true);

        axiosClient.post('/ai/chat', { message: question })
            .then((response) => {
                const data = response.data?.data;
                const sources = Array.isArray(data?.sources) ? data.sources : [];
                const sourceNames = sources.map(formatSource).filter(Boolean);
                const sourceText = sourceNames.length > 0
                    ? `\n\nNguồn dữ liệu: ${sourceNames.join(', ')}`
                    : '';

                setMessages((prev) => [
                    ...prev,
                    {
                        id: Date.now() + 1,
                        role: 'assistant',
                        content: `${data?.answer || 'Backend đã phản hồi nhưng không có nội dung trả lời.'}${sourceText}`,
                        time: formatTime()
                    }
                ]);
            })
            .catch((error) => {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: Date.now() + 1,
                        role: 'assistant',
                        content: buildErrorReply(error),
                        time: formatTime()
                    }
                ]);
            })
            .finally(() => {
                setIsThinking(false);
                textareaRef.current?.focus();
            });
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        sendMessage();
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    };

    return (
        <AdminLayout>
            <div className={styles.page}>
                <section className={styles.panel}>
                    <aside className={styles.sidebar}>
                        <div className={styles.assistantHeader}>
                            <div className={styles.assistantIcon}>
                                <i className="fas fa-robot" aria-hidden="true" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2>AI Assistant</h2>
                                <p>RAG chatbot cho DLC WMS</p>
                            </div>
                            <button 
                                onClick={clearHistory} 
                                className={styles.clearHistoryBtn}
                                title="Xóa lịch sử trò chuyện"
                            >
                                <i className="bi bi-trash"></i>
                            </button>
                        </div>

                        <div className={styles.statusBox}>
                            <span className={styles.statusDot} />
                            <div>
                                <strong>Đã nối backend</strong>
                                <p>Đọc dữ liệu hệ thống và gọi model khi được bật</p>
                            </div>
                        </div>

                        <div className={styles.promptGroup}>
                            <h3>GỢI Ý CÂU HỎI</h3>
                            {prompts.map((prompt, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    className={styles.promptButton}
                                    onClick={() => sendMessage(prompt)}
                                    disabled={isThinking}
                                >
                                    <i className="fas fa-wand-magic-sparkles" aria-hidden="true" />
                                    <span>{prompt}</span>
                                </button>
                            ))}
                        </div>
                    </aside>

                    <main className={styles.chatArea}>
                        <div className={styles.chatHeader}>
                            <div>
                                <h1>Trợ lý hỏi đáp AI</h1>
                                <p>Hỏi nhanh về nghiệp vụ kho, sản phẩm, bảo hành và sửa chữa.</p>
                            </div>
                            <span className={styles.badge}>RAG ready</span>
                        </div>

                        <div className={styles.messages} aria-live="polite">
                            {messages.map((message) => (
                                <article
                                    key={message.id}
                                    className={`${styles.messageRow} ${message.role === 'user' ? styles.userRow : ''}`}
                                >
                                    {message.role !== 'user' && (
                                        <div className={styles.avatar} aria-hidden="true">
                                            <i className="fas fa-robot" />
                                        </div>
                                    )}
                                    <div className={styles.messageContentWrapper}>
                                        <div className={styles.messageMeta}>
                                            {message.role !== 'user' && <strong>AI Assistant</strong>}
                                            <span>{message.time}</span>
                                        </div>
                                        <div className={styles.messageBubble}>
                                            <p>{message.content}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}

                            {isThinking && (
                                <article className={styles.messageRow}>
                                    <div className={styles.avatar} aria-hidden="true">
                                        <i className="fas fa-robot" />
                                    </div>
                                    <div className={styles.messageContentWrapper}>
                                        <div className={styles.messageMeta}>
                                            <strong>AI Assistant</strong>
                                        </div>
                                        <div className={`${styles.messageBubble} ${styles.typingBubble}`}>
                                            <span />
                                            <span />
                                            <span />
                                        </div>
                                    </div>
                                </article>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form className={styles.composer} onSubmit={handleSubmit}>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Nhập câu hỏi cho AI..."
                                rows={2}
                            />
                            <button type="submit" disabled={!canSend} title="Gửi câu hỏi">
                                <i className="fas fa-paper-plane" aria-hidden="true" />
                            </button>
                        </form>
                    </main>
                </section>
            </div>
        </AdminLayout>
    );
}

export default AiChatPage;
