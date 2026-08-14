import { useState, useEffect } from "react";
import styles from './Sidebar.module.css';
import socket from '../socket';

function Sidebar(props) {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchError, setSearchError] = useState('');

    const token = localStorage.getItem('token');
    const myId = JSON.parse(atob(token.split('.')[1])).id;

    useEffect(() => {
        if (!search.trim()) {
            setSearchResults([]);
            setSearchError('');
            return;
        }
        async function searchUsers() {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/search?username=${search}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await response.json();
                if (!response.ok) {
                    setSearchError(data.error);
                    setSearchResults([]);
                } else {
                    setSearchResults(data);
                    setSearchError('');
                }
            } catch (err) {
                console.error('Search error:', err);
            }
        }
        searchUsers();
    }, [search]);

    useEffect(() => {
        async function fetchConversations() {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/messages/conversations/latest`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) {
                console.error('Failed to fetch conversations:', data.error);
                return;
            }
            const usersWithOnline = data.map(user => ({ ...user, online: props.onlineUserIds.has(user.id) }));
            setUsers(usersWithOnline);
            console.log('onlineUserIds:', props.onlineUserIds, 'sample user id:', data[0]?.id, typeof data[0]?.id);
        }
        fetchConversations();
    }, [props.refreshUsers]);

    useEffect(() => {
    setUsers(prev => prev.map(u => ({ ...u, online: props.onlineUserIds.has(u.id) })));
}, [props.onlineUserIds]);

    // NEW: live-update the sidebar when a message arrives over the socket
    useEffect(() => {
        function handleReceiveMessage(message) {
            const otherUserId = message.sender_id === myId ? message.receiver_id : message.sender_id;

            setUsers(prevUsers => {
                const existing = prevUsers.find(u => u.id === otherUserId);

                const updatedUser = {
                    ...(existing || { id: otherUserId, username: message.sender_username, online: true }),
                    last_message: message.content,
                    last_message_time: message.sent_time,
                    sender_id: message.sender_id
                };

                const withoutThisUser = prevUsers.filter(u => u.id !== otherUserId);
                return [updatedUser, ...withoutThisUser];
            });
        }

        socket.on('receiveMessage', handleReceiveMessage);
        return () => socket.off('receiveMessage', handleReceiveMessage);
    }, [myId]);

    function handleClick(user) {
        props.onSelectUser(user);
    }

    function applyIncomingMessage(message) {
    const otherUserId = message.sender_id === myId ? message.receiver_id : message.sender_id;

    setUsers(prevUsers => {
        const existing = prevUsers.find(u => u.id === otherUserId);

        const updatedUser = {
            ...(existing || { id: otherUserId, username: message.sender_username, online: true }),
            last_message: message.content,
            last_message_time: message.sent_time,
            sender_id: message.sender_id
        };

        const withoutThisUser = prevUsers.filter(u => u.id !== otherUserId);
        return [updatedUser, ...withoutThisUser];
    });
}

useEffect(() => {
    if (!props.incomingMessage) return;
    applyIncomingMessage(props.incomingMessage);
}, [props.incomingMessage]);

    return (
        <div className={styles.div}>
            <input type="search" value={search} className={styles.searchBar} id="site-search" name="q" placeholder="Search" aria-label="Search through site content" onChange={(e) => setSearch(e.target.value)} />
            <div className={styles.userList}>
                {searchError && <p className={styles.searchError}>{searchError}</p>}
                {(search ? searchResults : users).map((user) => (
                    <div
                        key={user.id}
                        className={user.id === props.selectedUserId ? `${styles.chatName} ${styles.chatNameActive}` : styles.chatName}
                        onClick={() => { handleClick(user) }}
                    >
                        <div className={styles.avatarWrapper}>
                            <div className={styles.avatar}>{user.username[0]}</div>
                            {user.online && <div className={styles.onlineDot}></div>}
                        </div>
                        <div className={styles.nameBlock}>
                            <span className={styles.name}>{user.username}</span>
                            {user.last_message && (
                                <span className={styles.preview}>
                                    <strong>{user.sender_id === myId ? 'Me' : user.username}:</strong> {user.last_message.length > 40 ? user.last_message.slice(0, 40) + '…' : user.last_message}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Sidebar;