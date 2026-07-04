import { useMemo, useRef, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import AdminLayout from '../../components/layout/AdminLayout';
import styles from './AiChatPage.module.css';

const suggestedPrompts = [
    'Ton kho hien tai cua san pham nao dang thap?',
    'Tom tat phieu sua chua dang cho xu ly',
    'Huong dan tao phieu chuyen kho',
    'Tim don bao hanh theo so serial'
];

const initialMessages = [
    {
        id: 1,
        role: 'assistant',
        content: 'Xin chao, toi la tro ly AI cua DLC WMS. Ban co the hoi ve ton kho, phieu nhap xuat, bao hanh, sua chua hoac quy trinh van hanh.',
        time: '09:00'
    }
];

function buildMockReply(question) {
    return `Minh chua goi duoc backend cho cau hoi: "${question}". Hay kiem tra backend da chay chua, sau do thu lai.`;
}

function AiChatPage() {
    const [messages, setMessages] = useState(initialMessages);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const textareaRef = useRef(null);

    const canSend = input.trim().length > 0 && !isThinking;

    const currentTime = useMemo(() => {
        return new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date());
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
                const sourceText = sources.length > 0
                    ? `\n\nNguon du lieu: ${sources.map((source) => source.name).join(', ')}`
                    : '';
                setMessages((prev) => [
                    ...prev,
                    {
                        id: Date.now() + 1,
                        role: 'assistant',
                        content: `${data?.answer || buildMockReply(question)}${sourceText}`,
                        time: new Intl.DateTimeFormat('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                        }).format(new Date())
                    }
                ]);
            })
            .catch(() => {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: Date.now() + 1,
                        role: 'assistant',
                        content: buildMockReply(question),
                        time: new Intl.DateTimeFormat('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                        }).format(new Date())
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
                            <div>
                                <h2>AI Assistant</h2>
                                <p>RAG chatbot cho DLC WMS</p>
                            </div>
                        </div>

                        <div className={styles.statusBox}>
                            <span className={styles.statusDot} />
                            <div>
                                <strong>Demo UI</strong>
                                <p>San sang noi API RAG</p>
                            </div>
                        </div>

                        <div className={styles.promptGroup}>
                            <h3>Goi y cau hoi</h3>
                            {suggestedPrompts.map((prompt) => (
                                <button
                                    key={prompt}
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
                                <h1>Tro ly hoi dap AI</h1>
                                <p>Hoi nhanh ve nghiep vu kho, san pham, bao hanh va sua chua.</p>
                            </div>
                            <span className={styles.badge}>RAG ready</span>
                        </div>

                        <div className={styles.messages} aria-live="polite">
                            {messages.map((message) => (
                                <article
                                    key={message.id}
                                    className={`${styles.messageRow} ${message.role === 'user' ? styles.userRow : ''}`}
                                >
                                    <div className={styles.avatar} aria-hidden="true">
                                        <i className={message.role === 'user' ? 'fas fa-user' : 'fas fa-robot'} />
                                    </div>
                                    <div className={styles.messageBubble}>
                                        <div className={styles.messageMeta}>
                                            <strong>{message.role === 'user' ? 'Ban' : 'AI Assistant'}</strong>
                                            <span>{message.time}</span>
                                        </div>
                                        <p>{message.content}</p>
                                    </div>
                                </article>
                            ))}

                            {isThinking && (
                                <article className={styles.messageRow}>
                                    <div className={styles.avatar} aria-hidden="true">
                                        <i className="fas fa-robot" />
                                    </div>
                                    <div className={`${styles.messageBubble} ${styles.typingBubble}`}>
                                        <span />
                                        <span />
                                        <span />
                                    </div>
                                </article>
                            )}
                        </div>

                        <form className={styles.composer} onSubmit={handleSubmit}>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Nhap cau hoi cho AI..."
                                rows={2}
                            />
                            <button type="submit" disabled={!canSend} title="Gui cau hoi">
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
