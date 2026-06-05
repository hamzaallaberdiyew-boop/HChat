import { useState, useEffect } from "react";
import styles from './RegisterPage.module.css';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

function RegisterPage(){
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [secondPassword, setSecondPassword] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem('token');
        if(token) {
            navigate('/chat');
        } else{
            setLoading(false);
        }
    }, [navigate]);

    if(loading) return null;

    function changeUsername(event){
        const newUsername = event.target.value;
        setUsername(newUsername);
    }

    function changePassword(event){
        const newPassword = event.target.value;
        setPassword(newPassword);
    }

    function changeSecondPassword(event){
        const secPassword = event.target.value;
        setSecondPassword(secPassword);
    }

    async function handleSubmit(){
        if(username.length<3){
            setError('Username must be at least 3 characters!');
            return;
        }
        if(password.length<6){
            setError('Password must be at least 6 characters!');
            return;
        }
        if(password!==secondPassword){
            setError("Passwords do not match!");
            return;
        } else{
            setError("");
            const response = await fetch('http://localhost:5000/api/register', {
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
        }
    
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                <h1 className={styles.title}>Register Page</h1>
                <input placeholder="Username" value={username} className={styles.input} onChange={changeUsername}></input>
                <input type="password" placeholder="Password" value={password} className={styles.input} onChange={changePassword}></input>
                <input type="password" placeholder="Type your Password again" value={secondPassword} className={styles.input} onChange={changeSecondPassword}></input>
                {error && <p className={styles.error}>{error}</p>}
                <button className={styles.button} onClick={handleSubmit}>Submit</button>
                <p>Already have an account? <Link to="/login">Login</Link></p>
                </div>
            </div>
        )
}

export default RegisterPage;
