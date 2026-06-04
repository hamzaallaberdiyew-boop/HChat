import { useState } from "react";
import styles from './Chat.module.css'
import Sidebar from "../components/Sidebar";
import MessageList from "../components/MessageList"
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

function Chat(){
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState("");
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if(!token){
            navigate('/login');
        } else {
            const myId = JSON.parse(atob(token.split('.')[1])).id;
            socket.emit('join', myId);
            setLoading(false);
        }
    }, [navigate]);

    if(loading) return null;

    return (
        <div className={styles.container}>
        <Sidebar onSelectUser={setSelectedUser}/>
        <div className={styles.chatArea}>
            <MessageList selectedUser={selectedUser} refresh={refresh}
  onMessageSent={() => setRefresh(r => r + 1)}/>
        </div>
        </div>
    );
}
export default Chat;