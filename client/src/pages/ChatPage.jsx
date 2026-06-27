import { useState } from "react";
import styles from './Chat.module.css'
import Sidebar from "../components/Sidebar";
import MessageList from "../components/MessageList"
import Profile from "../components/Profile";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

function Chat(){
    const navigate = useNavigate();
    const [refreshUsers, setRefreshUsers] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState("");
    const [refresh, setRefresh] = useState(0);
    const [showSidebar, setShowSidebar] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const showSidebarF = (isMobile && !selectedUser) || (!isMobile && showSidebar);
    const showChat = (isMobile && selectedUser) || (!isMobile)
    const showBack = isMobile;

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

    useEffect(() => {
    function handleResize() {
        setIsMobile(window.innerWidth <= 768);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    }, []);

    if(loading) return null;

    return (
        <div className={styles.container}>
        {!isMobile && <div className={styles.profileSection}><Profile onSelectUser={setSelectedUser} refreshUsers={refreshUsers} setShowSidebar={setShowSidebar}/></div>}
        <div className={styles.contentSection}>
        {showSidebarF && <Sidebar onSelectUser={setSelectedUser} refreshUsers={refreshUsers}/>}
        {showChat && <div className={styles.chatArea}>
            <MessageList showBack={showBack} selectedUser={selectedUser} backFunc={setSelectedUser} refresh={refresh}
  onMessageSent={() => {setRefresh(r => r + 1); setRefreshUsers(r => r + 1);}
  }/>
        </div>}</div>
        </div>
    );
}
export default Chat;