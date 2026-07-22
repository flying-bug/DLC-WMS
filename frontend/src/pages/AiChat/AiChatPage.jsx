import { useMemo, useRef, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import AdminLayout from '../../components/layout/AdminLayout';
import styles from './AiChatPage.module.css';

const suggestedPrompts = [
    'Tá»“n kho hiá»‡n táº¡i cá»§a sáº£n pháº©m nÃ o Ä‘ang tháº¥p?',
    'TÃ³m táº¯t phiáº¿u sá»­a chá»¯a Ä‘ang chá» xá»­ lÃ½',
    'HÆ°á»›ng dáº«n táº¡o phiáº¿u chuyá»ƒn kho',
    'TÃ¬m Ä‘Æ¡n báº£o hÃ nh theo sá»‘ serial'
];

const initialMessages = [
    {
        id: 1,
        role: 'assistant',
        content: 'Xin chÃ o, tÃ´i lÃ  trá»£ lÃ½ AI cá»§a DLC WMS. Báº¡n cÃ³ thá»ƒ há»i vá» tá»“n kho, phiáº¿u nháº­p xuáº¥t, báº£o hÃ nh, sá»­a chá»¯a hoáº·c quy trÃ¬nh váº­n hÃ nh.',
        time: '09:00'
    }
];

function buildErrorReply(error) {
    if (!error.response) {
        return 'ChÆ°a káº¿t ná»‘i Ä‘Æ°á»£c backend. HÃ£y kiá»ƒm tra backend Spring Boot Ä‘Ã£ cháº¡y á»Ÿ port 8080 chÆ°a, rá»“i thá»­ láº¡i.';
    }

    if (error.response.status === 401) {
        return 'PhiÃªn Ä‘Äƒng nháº­p khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n. HÃ£y Ä‘Äƒng nháº­p láº¡i rá»“i há»i tiáº¿p.';
    }

    const userMessage = error.response.data?.userMessage || error.response.data?.message;
    if (userMessage) {
        return `Backend tráº£ vá» lá»—i: ${userMessage}`;
    }

    return `Backend Ä‘ang lá»—i ${error.response.status}. HÃ£y xem log Spring Boot Ä‘á»ƒ biáº¿t chi tiáº¿t.`;
}

function formatSource(source) {
    if (!source?.name) return null;

    if (source.type === 'model_status' && source.description) {
        return `${source.name} (${source.description})`;
    }

    return source.name;
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
                const sourceNames = sources.map(formatSource).filter(Boolean);
                const sourceText = sourceNames.length > 0
                    ? `\n\nNguá»“n dá»¯ liá»‡u: ${sourceNames.join(', ')}`
                    : '';

                setMessages((prev) => [
                    ...prev,
                    {
                        id: Date.now() + 1,
                        role: 'assistant',
                        content: `${data?.answer || 'Backend Ä‘Ã£ pháº£n há»“i nhÆ°ng khÃ´ng cÃ³ ná»™i dung tráº£ lá»i.'}${sourceText}`,
                        time: new Intl.DateTimeFormat('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                        }).format(new Date())
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
                                <strong>ÄÃ£ ná»‘i backend</strong>
                                <p>Äá»c dá»¯ liá»‡u há»‡ thá»‘ng vÃ  gá»i model khi Ä‘Æ°á»£c báº­t</p>
                            </div>
                        </div>

                        <div className={styles.promptGroup}>
                            <h3>Gá»£i Ã½ cÃ¢u há»i</h3>
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
                                <h1>Trá»£ lÃ½ há»i Ä‘Ã¡p AI</h1>
                                <p>Há»i nhanh vá» nghiá»‡p vá»¥ kho, sáº£n pháº©m, báº£o hÃ nh vÃ  sá»­a chá»¯a.</p>
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
                                            <strong>{message.role === 'user' ? 'Báº¡n' : 'AI Assistant'}</strong>
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
                                placeholder="Nháº­p cÃ¢u há»i cho AI..."
                                rows={2}
                            />
                            <button type="submit" disabled={!canSend} title="Gá»­i cÃ¢u há»i">
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
