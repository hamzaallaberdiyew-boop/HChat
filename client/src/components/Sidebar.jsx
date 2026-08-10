import { useState, useEffect } from "react";
import styles from './Sidebar.module.css';

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
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/conversations/latest`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) {
                console.error('Failed to fetch conversations:', data.error);
                return;
            }
            const usersWithOnline = data.map(user => ({ ...user, online: true }));
            setUsers(usersWithOnline);
        }
        fetchConversations();
    }, [props.refreshUsers]);

    function handleClick(user) {
        props.onSelectUser(user);
    }

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
                                    {user.sender_id === myId ? 'Me' : user.username}: {user.last_message.length > 40 ? user.last_message.slice(0, 40) + '…' : user.last_message}
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