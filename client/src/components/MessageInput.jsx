import { useState } from 'react';
import styles from './MessageInput.module.css';
import { IoSend } from 'react-icons/io5';
import socket from '../socket';

function MessageInput(props){
    const [text, setText] = useState("");
    const currUser = props.selectedUser;

    function changeText(event){
        setText(event.target.value);
    }

    async function handleClick(){
        if(!text.trim()) return;

        try {const token = localStorage.getItem('token');
        const myId = JSON.parse(atob(token.split('.')[1])).id;

        await fetch(`${process.env.REACT_APP_API_URL}/api/messages`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
            receiver_id: currUser.id,
            content: text
            })
        })
        socket.emit('sendMessage', {
            sender_id: myId,
            receiver_id: currUser.id,
            content: text
        });
        setText('');
        props.onMessageSent();
    } catch(err){
        console.error('Send message error:', err);
    }
    }

    return (
        <div className={styles.div}>
            <input placeholder='Type a message...' value={text} className={styles.hChat} onChange={changeText}></input>
            <button className={styles.button} onClick={handleClick} onKeyDown={(event) => {if (event==='enter') {handleClick();}}}><IoSend /></button>
        </div>
    );
}

export default MessageInput;

