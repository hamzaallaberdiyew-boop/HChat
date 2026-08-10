import { useNavigate } from 'react-router-dom';
import { LuArrowLeft } from 'react-icons/lu';
import styles from './SettingsPage.module.css';

function SettingsPage() {
    const navigate = useNavigate();

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <button className={styles.backButton} onClick={() => navigate('/chat')}>
                    <LuArrowLeft size={18} />
                    Back to chat
                </button>
                <h1 className={styles.title}>Settings</h1>
            </div>
            <p className={styles.placeholder}>Profile, theme, and notification settings are coming soon.</p>
        </div>
    );
}

export default SettingsPage;