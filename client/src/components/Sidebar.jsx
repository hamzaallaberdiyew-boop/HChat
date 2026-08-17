import { useState, useEffect, useCallback, useRef } from "react";
import styles from './Sidebar.module.css';
import socket from '../socket';

function Sidebar(props) {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchError, setSearchError] = useState('');

    const token = localStorage.getItem('token');
    const myId = token ? JSON.parse(atob(token.split('.')[1])).id : null;

    const { onlineUserIds, refreshUsers, incomingMessage, onSelectUser, selectedUserId } = props;

    // Kept in sync every render without being a dependency of the fetch
    // effect below — lets fetchConversations read current online status
    // without re-fetching the whole list every time someone's status flips.
    const onlineUserIdsRef = useRef(onlineUserIds);
    onlineUserIdsRef.current = onlineUserIds;

    useEffect(() => {
        if (!search.trim()) {
            setSearchResults([]);
            setSearchError('');
            return;
        }

        const controller = new AbortController();

        async function searchUsers() {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/search?username=${search}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal
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
                if (err.name !== 'AbortError') {
                    console.error('Search error:', err);
                }
            }
        }
        searchUsers();

        // Cancels the in-flight request if the user keeps typing, so a slow
        // earlier response can't land after a faster later one and show
        // stale results.
        return () => controller.abort();
    }, [search]);

    // Only re-fetches when refreshUsers changes — NOT on every online/offline
    // flicker, which would otherwise overwrite live unread counts / last
    // messages with a stale server snapshot on every status change.
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
            const usersWithOnline = data.map(user => ({
                ...user,
                online: onlineUserIdsRef.current.has(user.id),
                unread_count: Number(user.unread_count) || 0
            }));
            setUsers(usersWithOnline);
        }
        fetchConversations();
    }, [refreshUsers]);

    // Keeps online dots in sync whenever presence changes, without touching
    // unread counts / last messages / ordering.
    useEffect(() => {
        setUsers(prev => prev.map(u => ({ ...u, online: onlineUserIds.has(u.id) })));
    }, [onlineUserIds]);

    useEffect(() => {
        if (!props.readConversationId) return;
        setUsers(prev => prev.map(u =>
            u.id === props.readConversationId ? { ...u, unread_count: 0 } : u
        ));
    }, [props.readConversationId]);

    // Single source of truth for "a message affects the sidebar" — used by
    // both the live socket listener (covers every conversation, open or
    // not) and the incomingMessage prop path (covers optimistic sends for
    // the currently open conversation, before the server round-trip).
    // Consolidated from two near-duplicate implementations that used to
    // disagree on ID coercion (Number() in one, none in the other).
    const applyMessageUpdate = useCallback((message) => {
        const otherUserId = Number(message.sender_id) === Number(myId) ? message.receiver_id : message.sender_id;
        const isFromThem = Number(message.sender_id) !== Number(myId);
        const isConversationCurrentlyOpen = Number(otherUserId) === Number(selectedUserId);

        if (isFromThem && isConversationCurrentlyOpen) {
            const token = localStorage.getItem('token');
            fetch(`${process.env.REACT_APP_API_URL}/api/messages/${otherUserId}/read`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            }).catch(err => console.error('Auto mark-as-read failed:', err));
        }

        setUsers(prevUsers => {
            const existing = prevUsers.find(u => Number(u.id) === Number(otherUserId));
            const shouldIncrementUnread = isFromThem && !isConversationCurrentlyOpen;

            const updatedUser = {
                ...(existing || {
                    id: otherUserId,
                    // Backend doesn't send a username on the message payload
                    // itself — fall back to a placeholder rather than
                    // crashing on user.username[0] in render for a
                    // brand-new conversation partner not yet in the list.
                    username: message.sender_username || 'New chat',
                    online: true,
                    unread_count: 0
                }),
                last_message: message.content,
                last_message_time: message.sent_time,
                sender_id: message.sender_id,
                unread_count: shouldIncrementUnread
                    ? (existing?.unread_count || 0) + 1
                    : (existing?.unread_count || 0)
            };

            const withoutThisUser = prevUsers.filter(u => Number(u.id) !== Number(otherUserId));
            return [updatedUser, ...withoutThisUser];
        });
    }, [myId, selectedUserId]);

    useEffect(() => {
        if (!myId) return;
        socket.on('receiveMessage', applyMessageUpdate);
        return () => socket.off('receiveMessage', applyMessageUpdate);
    }, [myId, applyMessageUpdate]);

    useEffect(() => {
        if (!incomingMessage) return;
        applyMessageUpdate(incomingMessage);
    }, [incomingMessage, applyMessageUpdate]);

    function handleClick(user) {
        onSelectUser(user);
    }

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
                            <div className={styles.avatar}>{user.username ? user.username[0] : '?'}</div>
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