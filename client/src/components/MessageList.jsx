import { useState, useEffect, useRef } from 'react';
import styles from './MessageList.module.css';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import socket from '../socket';
import {LuArrowLeft } from 'react-icons/lu';


function MessageList(props){
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const messageListRef = useRef(null);
    const currUser = props.selectedUser;
    const token = localStorage.getItem('token');
    const myId = JSON.parse(atob(token.split('.')[1])).id;
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

    useEffect(() => {
    if (messageListRef.current) {
        messageListRef.current.scrollTop =
            messageListRef.current.scrollHeight;
    }
}, [messages.length, currUser]);

useEffect(() => {
    socket.on('receiveMessage', (message) => {
    if (message.sender_id === currUser.id || message.receiver_id === currUser.id) {
        setMessages(prev => {
            const alreadyExists = prev.some(m => m.id === message.id);
            if (alreadyExists) return prev;
            return [...prev, message];
        });
    }
    props.onLocalMessage?.(message);
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
}, [currUser]);

    useEffect(() => {
    async function fetchMessages() {
    if(!currUser) return;
    setLoading(true);
    
    try{const token = localStorage.getItem('token');

    
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/messages/${currUser.id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    setMessages(data);
    } catch(err){
        console.error('Fetch messages error:', err);
    } finally{
        setLoading(false);
    }
  }
  
  fetchMessages();
}, [currUser, props.refresh])

    if(!currUser) {
        return (<div className={styles.emptyState}>
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

    // optimistic update — apply the change to the screen immediately
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
        // reconcile with the real server response, in case anything differs
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
    props.onLocalMessage?.(optimisticMessage);
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
                {props.showBack && <button className={styles.backBtn} onClick={() => {props.backFunc("")}}><LuArrowLeft size={20} /></button>}
                <div className={styles.avatarWrapper}>
                            <div className={styles.avatar}>{currUser.username[0]}</div>
                            {props.onlineUserIds?.has(currUser.id) && <div className={styles.onlineDot}></div>}
                </div>
                <span className={styles.name}>{currUser.username}</span>
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
                onMessageSent={props.onMessageSent}
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

