import styles from './Profile.module.css';
import { useNavigate } from 'react-router-dom';
import { LuLogOut, LuSettings, LuMessageCircle } from 'react-icons/lu';

function Profile(props) {
    const { setShowSidebar } = props; // Деструктурируем пропсы для чистоты кода

    const token = localStorage.getItem('token');
    const myUsername = token ? JSON.parse(atob(token.split('.')[1])).username : '';
    const navigate = useNavigate();

    function handleLogOut() {
        localStorage.removeItem('token');
        navigate('/login');
    }

    return (
        <div className={styles.div}>
            <h1 className={styles.appName}>H·Chat</h1>
            <div className={styles.myProfile}>
                <div className={styles.myName}>
                    <div className={styles.avatar}>{myUsername ? myUsername[0] : ''}</div>
                    <span className={styles.name}>{myUsername}</span>
                </div>
                <button className={styles.button} onClick={() => setShowSidebar(prev => !prev)}>
                    <LuMessageCircle size={18} />
                    Chat
                </button>
                <button className={styles.button} onClick={() => navigate('/settings')}>
                    <LuSettings size={18} />
                    Settings
                </button>
                {/* Кнопка Logout теперь отображается всегда и доступна для пользователя */}
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
