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
        async function fetchUsers(){
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users`, {
            headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            const usersWithOnline = data.map(user => ({ ...user, online: true }));
            setUsers(usersWithOnline);
        }
        fetchUsers();
    }, [])

    function handleClick(user){
        props.onSelectUser(user);
    }

    return (<div className={styles.div}>
        <h1 className={styles.appName}>H·Chat</h1>
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
            <span className={styles.time}>{user.time}</span>
        </div>))}</div>
        <p className={styles.copyright}>© 2026 HChat</p>
    </div>);
}

export default Sidebar;