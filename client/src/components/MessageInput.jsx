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

        try {
            const token = localStorage.getItem('token');
            const myId = JSON.parse(atob(token.split('.')[1])).id;

            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    receiver_id: currUser.id,
                    content: text,
                    reply_to_id: replyingTo ? replyingTo.id : null
                })
            });

            const savedMessage = await response.json();
            if (!response.ok) {
                console.error('Send message error:', savedMessage.error);
                return;
            }

            // attach reply preview info locally so the sender's own bubble
            // shows the quote immediately, without needing a refetch
            const messageWithReplyInfo = {
                ...savedMessage,
                reply_content: replyingTo ? replyingTo.content : null,
                reply_sender_id: replyingTo ? replyingTo.sender_id : null
            };

            socket.emit('sendMessage', messageWithReplyInfo);
            setText('');
            props.onCancelReply();
            props.onMessageSent();
        } catch (err) {
            console.error('Send message error:', err);
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