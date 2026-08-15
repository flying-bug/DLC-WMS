import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAiFeature } from '../../contexts/AiFeatureContext';
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

function getMessageSources(message) {
    if (Array.isArray(message.sources) && message.sources.length > 0) {
        return message.sources;
    }
    if (typeof message.content === 'string' && message.content.includes('Nguồn dữ liệu:')) {
        const match = message.content.match(/Nguồn dữ liệu:\s*([^\n]+)/);
        if (match && match[1]) {
            return match[1].split(',').map(s => s.trim()).filter(Boolean);
        }
    }
    return [];
}

function cleanMessageContent(content) {
    if (!content) return '';
    return content.replace(/\n*Nguồn dữ liệu:\s*[\s\S]*$/i, '').trim();
}

function renderInlineMarkdown(text) {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

    return parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className={styles.strongText}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className={styles.inlineCode}>{part.slice(1, -1)}</code>;
        }
        return part;
    });
}

function FormattedMessage({ content }) {
    const cleaned = cleanMessageContent(content);
    if (!cleaned) return null;

    const lines = cleaned.split('\n');
    const elements = [];
    let currentList = [];
    let listType = null;

    const flushList = () => {
        if (currentList.length > 0) {
            if (listType === 'ul') {
                elements.push(
                    <ul key={`ul-${elements.length}`} className={styles.chatList}>
                        {currentList.map((item, idx) => (
                            <li key={idx} className={styles.chatListItem}>
                                {renderInlineMarkdown(item)}
                            </li>
                        ))}
                    </ul>
                );
            } else if (listType === 'ol') {
                elements.push(
                    <ol key={`ol-${elements.length}`} className={styles.chatOrderedList}>
                        {currentList.map((item, idx) => (
                            <li key={idx} className={styles.chatListItem}>
                                {renderInlineMarkdown(item)}
                            </li>
                        ))}
                    </ol>
                );
            }
            currentList = [];
            listType = null;
        }
    };

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            if (listType && listType !== 'ul') flushList();
            listType = 'ul';
            currentList.push(trimmed.replace(/^[*|-]\s+/, ''));
            return;
        }

        const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (orderedMatch) {
            if (listType && listType !== 'ol') flushList();
            listType = 'ol';
            currentList.push(orderedMatch[2]);
            return;
        }

        flushList();

        if (!trimmed) return;

        if (trimmed.startsWith('### ')) {
            elements.push(<h4 key={index} className={styles.chatH4}>{renderInlineMarkdown(trimmed.replace(/^###\s+/, ''))}</h4>);
        } else if (trimmed.startsWith('## ')) {
            elements.push(<h3 key={index} className={styles.chatH3}>{renderInlineMarkdown(trimmed.replace(/^##\s+/, ''))}</h3>);
        } else {
            elements.push(<p key={index} className={styles.chatParagraph}>{renderInlineMarkdown(trimmed)}</p>);
        }
    });

    flushList();
    return <div className={styles.formattedContent}>{elements}</div>;
}

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const cleaned = cleanMessageContent(text);
        navigator.clipboard.writeText(cleaned);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            type="button"
            className={styles.copyBtn}
            onClick={handleCopy}
            title="Sao chép câu trả lời"
        >
            <i className={copied ? "bi bi-check-lg" : "bi bi-copy"} />
            <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
        </button>
    );
}

function AiChatPage() {
    const navigate = useNavigate();
    const { aiEnabled } = useAiFeature();
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

        const userMsg = {
            id: Date.now(),
            role: 'user',
            content: question,
            time: currentTime
        };

        const historyPayload = messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .slice(-6)
            .map(m => ({ role: m.role, content: m.content }));

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);

        axiosClient.post('/ai/chat', { message: question, history: historyPayload })
            .then((response) => {
                const data = response.data?.data;
                const sources = Array.isArray(data?.sources) ? data.sources : [];
                const sourceNames = sources.map(formatSource).filter(Boolean);

                setMessages((prev) => [
                    ...prev,
                    {
                        id: Date.now() + 1,
                        role: 'assistant',
                        content: data?.answer || 'Backend đã phản hồi nhưng không có nội dung trả lời.',
                        sources: sourceNames,
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

    if (!aiEnabled) {
        return (
            <AdminLayout>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '65vh',
                    textAlign: 'center',
                    padding: '32px'
                }}>
                    <div style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        backgroundColor: '#fef2f2',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        marginBottom: '16px',
                        border: '1px solid #fee2e2'
                    }}>
                        <i className="bi bi-robot" />
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                        Tính năng Trợ lý AI hiện đang tạm khóa
                    </h2>
                    <p style={{ color: '#64748b', maxWidth: 480, marginBottom: '24px', lineHeight: 1.5 }}>
                        Quản trị viên đã tắt tính năng Trợ lý AI trên toàn hệ thống. Vui lòng liên hệ Admin nếu bạn cần sử dụng tính năng này.
                    </p>
                    <button
                        onClick={() => navigate('/main-dashboard')}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <i className="bi bi-arrow-left" /> Quay về Trang chủ
                    </button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className={styles.page}>
                <section className={styles.panel}>
                    <aside className={styles.sidebar}>
                        <div className={styles.assistantHeader}>
                            <div className={styles.assistantIcon}>
                                <i className="bi bi-robot" aria-hidden="true" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2>AI Assistant</h2>
                                <p>Trợ lý thông minh DLC WMS</p>
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
                                <strong>Hệ thống AI sẵn sàng</strong>
                                <p>Đọc dữ liệu thời gian thực & mô hình RAG</p>
                            </div>
                        </div>

                        <div className={styles.promptGroup}>
                            <h3><i className="bi bi-lightbulb-fill" style={{ color: '#eab308', marginRight: '6px' }} /> GỢI Ý CÂU HỎI</h3>
                            {prompts.map((prompt, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    className={styles.promptButton}
                                    onClick={() => sendMessage(prompt)}
                                    disabled={isThinking}
                                >
                                    <i className="bi bi-stars" aria-hidden="true" />
                                    <span>{prompt}</span>
                                </button>
                            ))}
                        </div>
                    </aside>

                    <main className={styles.chatArea}>
                        <div className={styles.chatHeader}>
                            <div>
                                <h1>Trợ lý hỏi đáp AI</h1>
                                <p>Hỏi nhanh về tồn kho, sản phẩm, bảo hành và quy trình nghiệp vụ kho.</p>
                            </div>
                            <span className={styles.badge}>
                                <i className="bi bi-cpu-fill" style={{ marginRight: '6px' }} /> RAG Powered
                            </span>
                        </div>

                        <div className={styles.messages} aria-live="polite">
                            {messages.map((message) => {
                                const sources = getMessageSources(message);
                                const isAssistant = message.role !== 'user';

                                return (
                                    <article
                                        key={message.id}
                                        className={`${styles.messageRow} ${!isAssistant ? styles.userRow : ''}`}
                                    >
                                        {isAssistant && (
                                            <div className={styles.avatar} aria-hidden="true">
                                                <i className="bi bi-robot" />
                                            </div>
                                        )}
                                        <div className={styles.messageContentWrapper}>
                                            <div className={styles.messageMeta}>
                                                {isAssistant && <strong>AI Assistant</strong>}
                                                <span>{message.time}</span>
                                                {isAssistant && <CopyButton text={message.content} />}
                                            </div>
                                            <div className={`${styles.messageBubble} ${isAssistant ? styles.assistantBubble : ''}`}>
                                                {isAssistant ? (
                                                    <FormattedMessage content={message.content} />
                                                ) : (
                                                    <p>{message.content}</p>
                                                )}

                                                {isAssistant && sources.length > 0 && (
                                                    <div className={styles.sourcesContainer}>
                                                        <div className={styles.sourcesHeader}>
                                                            <i className="bi bi-diagram-3-fill" />
                                                            <span>Nguồn dữ liệu tham chiếu:</span>
                                                        </div>
                                                        <div className={styles.sourceBadges}>
                                                            {sources.map((src, idx) => {
                                                                const isModel = src.toLowerCase().includes('gemini') || src.toLowerCase().includes('gpt');
                                                                return (
                                                                    <span key={idx} className={isModel ? styles.modelTag : styles.sourceTag}>
                                                                        <i className={isModel ? "bi bi-cpu-fill" : "bi bi-database-check"} />
                                                                        {src}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}

                            {isThinking && (
                                <article className={styles.messageRow}>
                                    <div className={styles.avatar} aria-hidden="true">
                                        <i className="bi bi-robot" />
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
                                placeholder="Nhập câu hỏi cho AI (VD: Tồn kho sản phẩm RAM DDR4 là bao nhiêu?)..."
                                rows={2}
                            />
                            <button type="submit" disabled={!canSend} title="Gửi câu hỏi">
                                <i className="bi bi-send-fill" aria-hidden="true" />
                            </button>
                        </form>
                    </main>
                </section>
            </div>
        </AdminLayout>
    );
}

export default AiChatPage;
