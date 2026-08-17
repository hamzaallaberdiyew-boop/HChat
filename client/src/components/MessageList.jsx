import { useState, useEffect, useRef } from 'react';
import styles from './MessageList.module.css';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import socket from '../socket';
import { LuArrowLeft } from 'react-icons/lu';

function formatLastSeen(timestamp) {
    if (!timestamp) return null;

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = diffMins / 60;

    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (diffHours < 8) {
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (isToday) return `today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        if (isYesterday) return `yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    if (isToday) return 'Active today';
    if (isYesterday) return 'Active yesterday';

    return null;
}

function MessageList(props) {
    const { selectedUser: currUser, refresh, onLocalMessage, onMessageSent, showBack, backFunc, onlineUserIds, onConversationRead } = props;

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const messageListRef = useRef(null);
    
    const token = localStorage.getItem('token');
    const myId = token ? JSON.parse(atob(token.split('.')[1])).id : null;
    const isCurrUserOnline = onlineUserIds?.has(currUser.id) ?? false;
    const [replyingTo, setReplyingTo] = useState(null);

    function handleReplyTrigger(message) {
        setReplyingTo(message);
    }

    function handleCancelReply() {
        setReplyingTo(null);
    }

    const [activeAction, setActiveAction] = useState(null); // { messageId, type } or null

    function setActive(messageId, type) {
        setActiveAction({ messageId, type });
    }

    function clearActive() {
        setActiveAction(null);
    }

    // Scroll to bottom whenever the conversation switches or a new message
    // arrives. Keyed off the last message's id (not messages.length) so it
    // fires correctly even when switching between two conversations that
    // happen to have the same message count, and doesn't re-fire on
    // in-place edits/reactions (those change content, not the last id).
    const lastMessage = messages[messages.length - 1];
    const lastMessageId = lastMessage ? lastMessage.id : null;

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            if (messageListRef.current) {
                messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
            }
        });
        return () => cancelAnimationFrame(frame);
    }, [lastMessageId, currUser]);

    useEffect(() => {
        if (!currUser) return;

        socket.on('receiveMessage', (message) => {
            if (message.sender_id === currUser.id || message.receiver_id === currUser.id) {
                setMessages(prev => {
                    const alreadyExists = prev.some(m => m.id === message.id);
                    if (alreadyExists) return prev;
                    return [...prev, message];
                });
            }
            onLocalMessage?.(message);
        });

        socket.on('reactionUpdate', (updatedMessage) => {
            setMessages(prev => prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m));
        });

        socket.on('messageUpdate', (updatedMessage) => {
            setMessages(prev => prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m));
        });

        return () => {
            socket.off('receiveMessage');
            socket.off('reactionUpdate');
            socket.off('messageUpdate');
        };
    }, [currUser, onLocalMessage]);

    useEffect(() => {
        async function fetchMessages() {
            if (!currUser) return;
            setLoading(true);

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/messages/${currUser.id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                const data = await response.json();
                setMessages(data);

                // Mark this conversation's messages as read now that it's open
                await fetch(`${process.env.REACT_APP_API_URL}/api/messages/${currUser.id}/read`, {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}` }
                });

                onConversationRead?.(currUser.id);
            } catch (err) {
                console.error('Fetch messages error:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchMessages();
    }, [currUser, refresh, onConversationRead]);


    if (!currUser) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>💬</div>
                <h2 className={styles.emptyTitle}>Welcome to HChat!</h2>
                <p className={styles.emptyText}>Select a conversation to start chatting</p>
            </div>
        );
    }

    async function handleReact(messageId, emoji) {
        const myReactionColumn = messages.find(m => m.id === messageId)?.sender_id === myId
            ? 'sender_reaction'
            : 'receiver_reaction';

        setMessages(prev => prev.map(m => {
            if (m.id !== messageId) return m;
            const currentValue = m[myReactionColumn];
            return { ...m, [myReactionColumn]: currentValue === emoji ? null : emoji };
        }));

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/messages/${messageId}/react`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ emoji })
            });
            const updatedMessage = await response.json();
            if (!response.ok) {
                console.error('React error:', updatedMessage.error);
                return;
            }
            setMessages(prev => prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m));
        } catch (err) {
            console.error('React request failed:', err);
        }
    }

    async function handleEdit(messageId, content) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/messages/${messageId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });
            const updatedMessage = await response.json();
            if (!response.ok) {
                console.error('Edit error:', updatedMessage.error);
                return;
            }
            setMessages(prev => prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m));
        } catch (err) {
            console.error('Edit request failed:', err);
        }
    }

    async function handleDelete(messageId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/messages/${messageId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const updatedMessage = await response.json();
            if (!response.ok) {
                console.error('Delete error:', updatedMessage.error);
                return;
            }
            setMessages(prev => prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m));
        } catch (err) {
            console.error('Delete request failed:', err);
        }
    }

    function handleOptimisticSend(optimisticMessage) {
        setMessages(prev => [...prev, optimisticMessage]);
        onLocalMessage?.(optimisticMessage);
    }

    function handleSendConfirmed(tempId, realMessage) {
        setMessages(prev => prev.map(m => m.id === tempId ? realMessage : m));
    }

    function handleSendFailed(tempId) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, sending: false, failed: true } : m));
    }

    return (
        <div className={styles.div}>
            <div className={styles.chatName}>
                {showBack && <button className={styles.backBtn} onClick={() => { backFunc("") }}><LuArrowLeft size={20} /></button>}
            <div className={styles.avatarWrapper}>
                <div className={styles.avatar}>{currUser.username[0]}</div>
                {isCurrUserOnline && <div className={styles.onlineDot}></div>}
            </div>
                        <div className={styles.nameBlock}>
                <span className={styles.name}>{currUser.username}</span>
                {isCurrUserOnline ? (
                    <span className={styles.statusLine}>Online</span>
                ) : (
                    formatLastSeen(currUser.last_seen) && (
                        <span className={styles.statusLine}>{formatLastSeen(currUser.last_seen)}</span>
                    )
                )}
            </div>
            </div>
            <div className={styles.messageList} ref={messageListRef}>
                {loading ? (
                    <p className={styles.loadingText}>Loading messages...</p>
                ) : (messages.map((message) => (
                    <MessageBubble
                        key={message.id}
                        message={message}
                        myId={myId}
                        onReact={handleReact}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onReply={handleReplyTrigger}
                        isPickerOpen={activeAction?.messageId === message.id && activeAction?.type === 'reaction'}
                        isMenuOpen={activeAction?.messageId === message.id && activeAction?.type === 'menu'}
                        isEditing={activeAction?.messageId === message.id && activeAction?.type === 'edit'}
                        setActive={setActive}
                        clearActive={clearActive}
                    />
                )))}
            </div>
            <MessageInput
                selectedUser={currUser}
                onMessageSent={onMessageSent}
                replyingTo={replyingTo}
                onCancelReply={handleCancelReply}
                onOptimisticSend={handleOptimisticSend}
                onSendConfirmed={handleSendConfirmed}
                onSendFailed={handleSendFailed}
            />
        </div>
    );
}

export default MessageList;