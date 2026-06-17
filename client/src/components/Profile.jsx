import { useState, useEffect } from "react";
import styles from './Profile.module.css';
import { useNavigate } from 'react-router-dom';
import { LuLogOut, LuChevronRight, LuChevronDown, LuSettings, LuMessageCircle } from 'react-icons/lu';

function Profile(props){

    const token = localStorage.getItem('token');
    const myUsername = JSON.parse(atob(token.split('.')[1])).username;
    const navigate = useNavigate();
    const [settingsOpen, setSettingsOpen] = useState(false);

    function handleLogOut(){
        localStorage.removeItem('token');
        navigate('/login');
    }

    function handleSettings(){
        setSettingsOpen(prev => !prev)
    }

    return (<div className={styles.div}>
        <h1 className={styles.appName}>H·Chat</h1>
        <div className={styles.myProfile}>
                <div className={styles.myName}>
                    <div className={styles.avatar}>{myUsername[0]}</div>
                    <span className={styles.name}>{myUsername}</span>
                </div>
            <button className={styles.button} onClick={() => props.setShowSidebar(prev => !prev)}>
                <LuMessageCircle size={18} />
                Chat
            </button>
            <button className={styles.button} onClick={handleSettings}>
                <LuSettings size={18} />
                Settings
                {settingsOpen ? <LuChevronDown size={18} /> : <LuChevronRight size={18} />}
            </button>
            {settingsOpen && <button className={styles.button} onClick={handleLogOut}>
                <LuLogOut size={18} />
                Logout
            </button>}
        </div>
        <p className={styles.copyright}>© 2026 HChat</p>
    </div>);
}

export default Profile;