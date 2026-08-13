import { useState } from 'react';
import styles from './MessageInput.module.css';
import { IoSend } from 'react-icons/io5';
import { LuX } from 'react-icons/lu';
import socket from '../socket';

function MessageInput(props) {
    const [text, setText] = useState("");
    const currUser = props.selectedUser;
    const replyingTo = props.replyingTo;

    function changeText(event) {
        setText(event.target.value);
    }

    async function handleClick() {
    if (!text.trim()) return;

    const token = localStorage.getItem('token');
    const myId = JSON.parse(atob(token.split('.')[1])).id;
    const messageText = text.trim();

    // optimistic message — shown instantly with a temporary id
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
        id: tempId,
        sender_id: myId,
        receiver_id: currUser.id,
        content: messageText,
        sent_time: new Date().toISOString(),
        reply_to_id: replyingTo ? replyingTo.id : null,
        reply_content: replyingTo ? replyingTo.content : null,
        reply_sender_id: replyingTo ? replyingTo.sender_id : null,
        sender_reaction: null,
        receiver_reaction: null,
        edited: false,
        deleted: false,
        sending: true
    };

    props.onOptimisticSend(optimisticMessage);
    setText('');
    props.onCancelReply();

    try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                receiver_id: currUser.id,
                content: messageText,
                reply_to_id: replyingTo ? replyingTo.id : null
            })
        });

        const savedMessage = await response.json();
        if (!response.ok) {
            console.error('Send message error:', savedMessage.error);
            props.onSendFailed(tempId);
            return;
        }

        const messageWithReplyInfo = {
            ...savedMessage,
            reply_content: replyingTo ? replyingTo.content : null,
            reply_sender_id: replyingTo ? replyingTo.sender_id : null
        };

        props.onSendConfirmed(tempId, messageWithReplyInfo);
        socket.emit('sendMessage', messageWithReplyInfo);
    } catch (err) {
        console.error('Send message error:', err);
        props.onSendFailed(tempId);
    }
}

    return (
        <div className={styles.inputArea}>
            {replyingTo && (
                <div className={styles.replyPreview}>
                    <div className={styles.replyPreviewText}>
                        <strong>Replying to:</strong> {replyingTo.content.length > 50 ? replyingTo.content.slice(0, 50) + '…' : replyingTo.content}
                    </div>
                    <button className={styles.replyCancelBtn} onClick={props.onCancelReply}>
                        <LuX size={14} />
                    </button>
                </div>
            )}
            <div className={styles.div}>
                <input placeholder='Type a message...' value={text} className={styles.hChat} onChange={changeText} onKeyDown={(event) => { if (event.key === 'Enter') { handleClick(); } }}></input>
                <button className={styles.button} onClick={handleClick}><IoSend /></button>
            </div>
        </div>
    );
}

export default MessageInput;