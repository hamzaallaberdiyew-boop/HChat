import { useState, useRef, useEffect } from 'react';
import styles from './MessageBubble.module.css';
import { LuEllipsisVertical, LuPencil, LuTrash2, LuCheck, LuX, LuReply } from 'react-icons/lu';

const REACTION_OPTIONS = ['👍', '❤️', '😂', '😮', '😢'];

function MessageBubble(props) {
    const [editText, setEditText] = useState(props.message.content);
    const wrapperRef = useRef(null);

    const message = props.message;
    const isMe = message.sender_id === props.myId;
    const pickerOpen = props.isPickerOpen;
    const menuOpen = props.isMenuOpen;
    const editing = props.isEditing;

    const hasReaction = message.sender_reaction || message.receiver_reaction;

    useEffect(() => {
        if (!pickerOpen && !menuOpen) return;

        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                props.clearActive();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [pickerOpen, menuOpen]);

    const formattedTime = new Date(message.sent_time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    function togglePicker() {
        pickerOpen ? props.clearActive() : props.setActive(message.id, 'reaction');
    }

    function toggleMenu() {
        menuOpen ? props.clearActive() : props.setActive(message.id, 'menu');
    }

    function handlePick(emoji) {
        props.clearActive();
        props.onReact(message.id, emoji);
    }

    function startEdit() {
        setEditText(message.content);
        props.setActive(message.id, 'edit');
    }

    function cancelEdit() {
        props.clearActive();
        setEditText(message.content);
    }

    function confirmEdit() {
        if (!editText.trim()) return;
        props.onEdit(message.id, editText.trim());
        props.clearActive();
    }

    function handleDelete() {
        props.clearActive();
        props.onDelete(message.id);
    }

    if (message.deleted) {
        return (
            <div className={styles.bubbleWrapper} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                <div className={styles.deletedMessage}>
                    <em>This message was deleted</em>
                </div>
            </div>
        );
    }

    return (
         <div
         ref={wrapperRef}
        className={`${styles.bubbleWrapper} ${hasReaction ? styles.raised : ''}`}
        style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}
    >
            <div className={isMe ? styles.myMessage : styles.otherMessage}>

                {message.reply_content && (
                    <div className={styles.quotedReply}>
                        {message.reply_content.length > 40 ? message.reply_content.slice(0, 40) + '…' : message.reply_content}
                    </div>
                )}

                {editing ? (
                    <div className={styles.editArea}>
                        <input
                            className={styles.editInput}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmEdit();
                                if (e.key === 'Escape') cancelEdit();
                            }}
                            autoFocus
                        />
                        <button className={styles.editIconBtn} onClick={confirmEdit}><LuCheck size={14} /></button>
                        <button className={styles.editIconBtn} onClick={cancelEdit}><LuX size={14} /></button>
                    </div>
                ) : (
                    <>
                        {message.content}
                        {message.edited && <span className={styles.editedTag}>(edited)</span>}
                        <span className={styles.time}>{formattedTime}</span>
                    </>
                )}

                {!editing && (
                    <>
                        <button className={styles.reactTrigger} onClick={togglePicker}>
                            🙂
                        </button>

                        <button className={styles.replyTrigger} onClick={() => props.onReply(message)}>
                            <LuReply size={14} />
                        </button>

                        {isMe && (
                            <button className={styles.menuTrigger} onClick={toggleMenu}>
                                <LuEllipsisVertical size={14} />
                            </button>
                        )}
                    </>
                )}

                {menuOpen && (
                    <div className={styles.optionsMenu}>
                        <button className={styles.optionItem} onClick={startEdit}>
                            <LuPencil size={13} /> Edit
                        </button>
                        <button className={`${styles.optionItem} ${styles.optionDelete}`} onClick={handleDelete}>
                            <LuTrash2 size={13} /> Delete
                        </button>
                    </div>
                )}

                {pickerOpen && (
                    <div className={styles.reactionPicker}>
                        {REACTION_OPTIONS.map(emoji => (
                            <button key={emoji} className={styles.reactionOption} onClick={() => handlePick(emoji)}>
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {(message.sender_reaction || message.receiver_reaction) && (
                <div className={isMe ? styles.reactionBadgeRight : styles.reactionBadgeLeft}>
                    {message.sender_reaction && <span>{message.sender_reaction}</span>}
                    {message.receiver_reaction && <span>{message.receiver_reaction}</span>}
                </div>
            )}
        </div>
    );
}

export default MessageBubble;