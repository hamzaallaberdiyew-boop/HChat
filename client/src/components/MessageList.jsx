import { useState, useEffect } from 'react';
import styles from './MessageList.module.css';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import socket from '../socket';

function MessageList(props){
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const currUser = props.selectedUser;
    const token = localStorage.getItem('token');
    const myId = JSON.parse(atob(token.split('.')[1])).id;

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

    useEffect(() => {
    socket.on('receiveMessage', (message) => {
        setMessages(prev => [...prev, message]);
    });

    return () => {
        socket.off('receiveMessage');
    };
    }, []);

    if(!currUser) {
        return (<div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💬</div>
            <h2 className={styles.emptyTitle}>Welcome to HChat!</h2>
            <p className={styles.emptyText}>Select a conversation to start chatting</p>
        </div>
        );
    }

    return (
        <div className={styles.div}>
            <div className={styles.chatName}>
                <div className={styles.avatarWrapper}>
                            <div className={styles.avatar}>{currUser.username[0]}</div>
                            {currUser.online && <div className={styles.onlineDot}></div>}
                </div>
                <span className={styles.name}>{currUser.username}</span>
            </div>
            <div className={styles.messageList}>
                {loading ? (
                    <p className={styles.loadingText}>Loading messages...</p>
                ) : (messages.map((message) => (
                    <MessageBubble key={message.id} text={message.content} sender={message.sender_id === myId ? "me" : "other"}/>
                )))}
            </div>
            <MessageInput selectedUser={currUser} onMessageSent={props.onMessageSent}/>
        </div>
    );
}

export default MessageList;

