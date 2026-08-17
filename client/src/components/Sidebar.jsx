import { useState, useEffect, useCallback } from "react";
import styles from './Sidebar.module.css';
import socket from '../socket';

function Sidebar(props) {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchError, setSearchError] = useState('');

    const token = localStorage.getItem('token');
    const myId = token ? JSON.parse(atob(token.split('.')[1])).id : null;

    // Извлекаем нужные свойства из props, чтобы избежать лишних срабатываний useEffect
    const { onlineUserIds, refreshUsers, incomingMessage, onSelectUser, selectedUserId } = props;

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
            // Используем деструктурированную переменную onlineUserIds
            const usersWithOnline = data.map(user => ({ ...user, online: onlineUserIds.has(user.id), unread_count: Number(user.unread_count) || 0 }));
            setUsers(usersWithOnline);
            console.log('onlineUserIds:', onlineUserIds, 'sample user id:', data[0]?.id, typeof data[0]?.id);
        }
        fetchConversations();
    }, [refreshUsers, onlineUserIds]); // Добавили onlineUserIds, так как она используется внутри

    useEffect(() => {
        setUsers(prev => prev.map(u => ({ ...u, online: onlineUserIds.has(u.id) })));
    }, [onlineUserIds]); // Используем чистую переменную onlineUserIds

    useEffect(() => {
        if (!props.readConversationId) return;
        setUsers(prev => prev.map(u =>
            u.id === props.readConversationId ? { ...u, unread_count: 0 } : u
        ));
    }, [props.readConversationId]);

    // LIVE-UPDATE via Socket
    useEffect(() => {
        if (!myId) return;
        
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
        onSelectUser(user);
    }

    // Оборачиваем функцию в useCallback, чтобы она не пересоздавалась при каждом рендере
    function applyIncomingMessage(message) {
        const otherUserId = message.sender_id === myId ? message.receiver_id : message.sender_id;
        const isFromThem = message.sender_id !== myId;
        const isConversationCurrentlyOpen = otherUserId === props.selectedUserId;

        if (isFromThem && isConversationCurrentlyOpen) {
            const token = localStorage.getItem('token');
            fetch(`${process.env.REACT_APP_API_URL}/api/messages/${otherUserId}/read`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            }).catch(err => console.error('Auto mark-as-read failed:', err));
        }

        setUsers(prevUsers => {
            const existing = prevUsers.find(u => u.id === otherUserId);
            const shouldIncrementUnread = isFromThem && !isConversationCurrentlyOpen;

            const updatedUser = {
                ...(existing || { id: otherUserId, username: message.sender_username, online: true, unread_count: 0 }),
                last_message: message.content,
                last_message_time: message.sent_time,
                sender_id: message.sender_id,
                unread_count: shouldIncrementUnread
                    ? (existing?.unread_count || 0) + 1
                    : (existing?.unread_count || 0)
            };

            const withoutThisUser = prevUsers.filter(u => u.id !== otherUserId);
            return [updatedUser, ...withoutThisUser];
        });
    }

    useEffect(() => {
        if (!incomingMessage) return;
        applyIncomingMessage(incomingMessage);
    }, [incomingMessage, applyIncomingMessage]); // Теперь и функция, и сообщение в зависимостях

    return (
        <div className={styles.div}>
            <input type="search" value={search} className={styles.searchBar} id="site-search" name="q" placeholder="Search" aria-label="Search through site content" onChange={(e) => setSearch(e.target.value)} />
            <div className={styles.userList}>
                {searchError && <p className={styles.searchError}>{searchError}</p>}
                {(search ? searchResults : users).map((user) => (
                    <div
                        key={user.id}
                        className={user.id === selectedUserId ? `${styles.chatName} ${styles.chatNameActive}` : styles.chatName}
                        onClick={() => { handleClick(user) }}
                    >
                        <div className={styles.avatarWrapper}>
                            <div className={styles.avatar}>{user.username[0]}</div>
                            {user.online && <div className={styles.onlineDot}></div>}
                        </div>
                        <div className={styles.nameBlock}>
                            <div className={styles.nameRow}>
                                <span className={styles.name}>{user.username}</span>
                                {user.unread_count > 0 && (
                                    <span className={styles.unreadBadge}>{user.unread_count > 9 ? '9+' : user.unread_count}</span>
                                )}
                            </div>
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
