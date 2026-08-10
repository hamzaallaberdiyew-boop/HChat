import { useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';

function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className={styles.page}>
            <nav className={styles.nav}>
                <span className={styles.logo}>H<span className={styles.dot}>·</span>Chat</span>
                <div className={styles.navButtons}>
                    <button className={styles.ghostButton} onClick={() => navigate('/login')}>Log in</button>
                    <button className={styles.primaryButton} onClick={() => navigate('/register')}>Sign up</button>
                </div>
            </nav>

            <main className={styles.hero}>
                <h1 className={styles.headline}>
                    Conversations that <span className={styles.dot}>·</span> feel instant.
                </h1>
                <p className={styles.subhead}>
                    H·Chat is a fast, no-clutter messenger built for people who just want to talk — no ads, no noise, no bloat.
                </p>
                <div className={styles.ctaRow}>
                    <button className={styles.primaryButton} onClick={() => navigate('/register')}>
                        Get started free
                    </button>
                    <button className={styles.ghostButton} onClick={() => navigate('/login')}>
                        I already have an account
                    </button>
                </div>
            </main>

            <footer className={styles.footer}>© 2026 HChat</footer>
        </div>
    );
}

export default LandingPage;