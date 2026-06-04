import { useState, useEffect } from 'react';
import styles from './LoginPage.module.css'
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';


function LoginPage(){
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem('token');
        if(token) {
            navigate('/chat');
        } else{
            setLoading(false);
        }
    }, []);

    if(loading) return null;

    function changeUsername(event){
        const newUsername = event.target.value;
        setUsername(newUsername);
    }

    function changePassword(event){
        const newPassword = event.target.value;
        setPassword(newPassword);
    }

    async function handleSubmit(){
        const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }, 
                body: JSON.stringify({username, password})
            });
            const data = await response.json();
            if(response.ok){
                localStorage.setItem('token', data.token);
                navigate('/chat');
            } else{
                setError(data.error);
            }
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
            <h1 className={styles.title}>Login Page</h1>
            <input placeholder="Username" value={username} className={styles.input} onChange={changeUsername}></input>
            <input type="password" placeholder="Password" value={password} className={styles.input} onChange={changePassword}></input>
            <button className={styles.button} onClick={handleSubmit}>Submit</button>
            {error && <p className={styles.error}>{error}</p>}
            <p>Don't have an account? <Link to="/register">Register</Link></p>
            </div>
        </div>
    )
}

export default LoginPage;