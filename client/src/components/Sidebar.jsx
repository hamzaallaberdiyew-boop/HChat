import { useState, useEffect } from "react";
import styles from './Sidebar.module.css';

function Sidebar(props){
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchError, setSearchError] = useState('');

    useEffect(() => {
        if(!search.trim()) {
            setSearchResults([]);
            setSearchError('');
            return;
        }
        async function searchUsers() {
            try {const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/search?username=${search}`, {
            headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if(!response.ok) {
                setSearchError(data.error);
                setSearchResults([]);
            } else {
                setSearchResults(data);
                setSearchError('');
            }} catch (err){
                console.error('Search error:', err);
            }
        }
        searchUsers();
    }, [search])

     useEffect(() => {
        async function fetchUsers() {
            const token = localStorage.getItem('token');

            const usersResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const usersData = await usersResponse.json();
            if (!usersResponse.ok) {
                console.error('Failed to fetch users:', usersData.error);
                return;
            }

            const convosResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/users/conversations/latest`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const convosData = await convosResponse.json();
            if (!convosResponse.ok) {
                console.error('Failed to fetch conversations:', convosData.error);
            }

            // build the merged list with your original loop approach
            const merged = [];
            for (let i = 0; i < usersData.length; i++) {
                const user = usersData[i];
                let lastMessage = undefined;
                let lastMessageTime = undefined;
                let lastSenderId = undefined;

                if (convosResponse.ok) {
                    for (let j = 0; j < convosData.length; j++) {
                        if (convosData[j].other_user_id === user.id) {
                            lastMessage = convosData[j].last_message;
                            lastMessageTime = convosData[j].last_message_time;
                            lastSenderId = convosData[j].sender_id;
                            break;
                        }
                    }
                }

                merged.push({
                    ...user,
                    online: true,
                    lastMessage,
                    lastMessageTime,
                    lastSenderId
                });
            }

            setUsers(merged);
        }
        fetchUsers();
    }, [props.refreshUsers]);

    function handleClick(user){
        props.onSelectUser(user);
    }

    return (<div className={styles.div}>
    <input type="search" value={search} className={styles.searchBar} id="site-search" name="q" placeholder="Search" aria-label="Search through site content" onChange={(e) => setSearch(e.target.value)}></input>
    <div className={styles.userList}>
        {searchError && <p className={styles.searchError}>{searchError}</p>}
        {(search ? searchResults : users).map((user) => (
        <div key={user.id}  className={styles.chatName} onClick={() => {handleClick(user)}}>
        <div className={styles.avatarWrapper}>
            <div className={styles.avatar}>{user.username[0]}</div>
            {user.online && <div className={styles.onlineDot}></div>}
        </div>
            <span className={styles.name}>{user.username}</span>
        </div>))}</div>
        
    </div>);
}

export default Sidebar;