import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuCheck } from 'react-icons/lu';
import styles from './SettingsPage.module.css';
import Avatar from '../components/Avatar';

function SettingsPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
    const [selectedIcon, setSelectedIcon] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const AVATAR_COLORS = [
    '#4f5fae', '#e15252', '#4ade80', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'
    ];

    const AVATAR_ICONS = [
        { id: 'cat', emoji: '🐱' },
        { id: 'dog', emoji: '🐶' },
        { id: 'fox', emoji: '🦊' },
        { id: 'panda', emoji: '🐼' },
        { id: 'robot', emoji: '🤖' },
        { id: 'ghost', emoji: '👻' },
        { id: 'star', emoji: '⭐' },
        { id: 'fire', emoji: '🔥' }
    ];

    useEffect(() => {
        const token = localStorage.getItem('token');
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUsername(payload.username);
        // color/icon aren't in the token, so fetch the real profile
        async function fetchProfile() {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setSelectedColor(data.avatar_color || AVATAR_COLORS[0]);
                setSelectedIcon(data.avatar_icon || null);
            }
        }
        fetchProfile();
    }, []);

    async function handleSave() {
        setSaving(true);
        setSaved(false);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/me/avatar`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ avatar_color: selectedColor, avatar_icon: selectedIcon })
            });
            if (response.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch (err) {
            console.error('Save avatar error:', err);
        } finally {
            setSaving(false);
        }
    }

    const previewUser = { username, avatar_color: selectedColor, avatar_icon: selectedIcon };

    
    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <button className={styles.backButton} onClick={() => navigate('/chat')}>
                    <LuArrowLeft size={18} />
                    Back to chat
                </button>
                <h1 className={styles.title}>Settings</h1>
            </div>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Avatar</h2>

                <div className={styles.previewRow}>
                    <Avatar user={previewUser} size={72} />
                    <span className={styles.previewName}>{username}</span>
                </div>

                <div className={styles.pickerGroup}>
                    <p className={styles.pickerLabel}>Color</p>
                    <div className={styles.colorGrid}>
                        {AVATAR_COLORS.map(color => (
                            <button
                                key={color}
                                className={styles.colorSwatch}
                                style={{ backgroundColor: color }}
                                onClick={() => setSelectedColor(color)}
                            >
                                {selectedColor === color && <LuCheck size={16} color="white" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.pickerGroup}>
                    <p className={styles.pickerLabel}>Icon (optional)</p>
                    <div className={styles.iconGrid}>
                        <button
                            className={`${styles.iconSwatch} ${!selectedIcon ? styles.iconSwatchActive : ''}`}
                            onClick={() => setSelectedIcon(null)}
                        >
                            {username ? username[0].toUpperCase() : '?'}
                        </button>
                        {AVATAR_ICONS.map(icon => (
                            <button
                                key={icon.id}
                                className={`${styles.iconSwatch} ${selectedIcon === icon.id ? styles.iconSwatchActive : ''}`}
                                onClick={() => setSelectedIcon(icon.id)}
                            >
                                {icon.emoji}
                            </button>
                        ))}
                    </div>
                </div>

                <button className={styles.saveButton} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save changes'}
                </button>
            </section>
        </div>
    );
}

export default SettingsPage;