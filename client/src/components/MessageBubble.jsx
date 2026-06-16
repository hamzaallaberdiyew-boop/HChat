import styles from './MessageBubble.module.css';

function MessageBubble(props){
    const formattedTime = new Date(props.time).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

    function checkUser(){
        if(props.sender==='me'){
            return true;
        } else{
            return false;
        }
    }

    return (
        checkUser() ? <div className={styles.myMessage}>
            {props.text}
        <span className={styles.time}>{formattedTime}</span>
        </div> : 
        <div className={styles.otherMessage}>
            {props.text}
            <span className={styles.time}>{formattedTime}</span>
            </div>
    );
}

export default MessageBubble;