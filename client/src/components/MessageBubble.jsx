import { useState } from "react";
import styles from './MessageBubble.module.css';
import { Link } from 'react-router-dom';

function MessageBubble(props){
    function checkUser(){
        if(props.sender=='me'){
            return true;
        } else{
            return false;
        }
    }

    return (
        checkUser() ? <div className={styles.myMessage}>{props.text}</div> : <div className={styles.otherMessage}>{props.text}</div>
    );
}

export default MessageBubble;