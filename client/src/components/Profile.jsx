import { useState, useEffect } from 'react';
import styles from './Profile.module.css';
import { useNavigate } from 'react-router-dom';
import { LuLogOut, LuSettings, LuMessageCircle } from 'react-icons/lu';
import Avatar from '../components/Avatar';

function Profile(props) {
    const { setShowSidebar } = props;
    const navigate = useNavigate();
    const [myProfile, setMyProfile] = useState(null);

    useEffect(() => {
        async function fetchProfile() {
            const token = localStorage.getItem('token');
            if (!token) return;
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setMyProfile(data);
        }
        fetchProfile();
    }, []);

    function handleLogOut() {
        localStorage.removeItem('token');
        navigate('/login');
    }

    if (!myProfile) return null; // or a small loading skeleton

    return (
        <div className={styles.div}>
            <h1 className={styles.appName}>H·Chat</h1>
            <div className={styles.myProfile}>
                <div className={styles.myName}>
                    <Avatar user={myProfile} size={40} />
                    <span className={styles.name}>{myProfile.username}</span>
                </div>
                <button className={styles.button} onClick={() => setShowSidebar(prev => !prev)}>
                    <LuMessageCircle size={18} />
                    Chat
                </button>
                <button className={styles.button} onClick={() => navigate('/settings')}>
                    <LuSettings size={18} />
                    Settings
                </button>
                <button className={styles.button} onClick={handleLogOut}>
                    <LuLogOut size={18} />
                    Logout
                </button>
            </div>
            <p className={styles.copyright}>© 2026 HChat</p>
        </div>
    );
}

export default Profile;