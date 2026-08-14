import { useState, useRef, useEffect, memo } from 'react';
import styles from './MessageBubble.module.css';
import { LuEllipsisVertical, LuPencil, LuTrash2, LuCheck, LuX, LuReply } from 'react-icons/lu';

const REACTION_OPTIONS = ['👍', '❤️', '😂', '😮', '😢'];

function MessageBubble(props) {
    // 1. Деструктурируем все необходимые функции и переменные из props
    const { 
        message, 
        myId, 
        isPickerOpen: pickerOpen, 
        isMenuOpen: menuOpen, 
        isEditing: editing, 
        clearActive, 
        setActive, 
        onReact, 
        onEdit, 
        onDelete, 
        onReply 
    } = props;

    const [editText, setEditText] = useState(message.content);
    const wrapperRef = useRef(null);

    const isMe = message.sender_id === myId;

    const hasReaction = message.sender_reaction || message.receiver_reaction;
    const hasOpenPopup = pickerOpen || menuOpen;

    const myReaction = isMe ? message.sender_reaction : message.receiver_reaction;

    // 2. Исправленный useEffect: теперь он зависит от функции clearActive, а не от всего props
    useEffect(() => {
        if (!pickerOpen && !menuOpen) return;

        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                clearActive();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [pickerOpen, menuOpen, clearActive]); // Добавили clearActive в зависимости

    const formattedTime = new Date(message.sent_time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    function togglePicker() {
        pickerOpen ? clearActive() : setActive(message.id, 'reaction');
    }

    function toggleMenu() {
        menuOpen ? clearActive() : setActive(message.id, 'menu');
    }

    function handlePick(emoji) {
        clearActive();
        onReact(message.id, emoji);
    }

    function startEdit() {
        setEditText(message.content);
        setActive(message.id, 'edit');
    }

    function cancelEdit() {
        clearActive();
        setEditText(message.content);
    }

    function confirmEdit() {
        if (!editText.trim()) return;
        onEdit(message.id, editText.trim());
        clearActive();
    }

    function handleDelete() {
        clearActive();
        onDelete(message.id);
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
            className={`${styles.bubbleWrapper} ${hasReaction ? styles.raised : ''} ${hasOpenPopup ? styles.popupOpen : ''}`}
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
                        {!hasReaction && (
                            <button className={styles.reactTrigger} onClick={togglePicker}>
                                🙂
                            </button>
                        )}

                        <button className={styles.replyTrigger} onClick={() => onReply(message)}>
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
                            <button
                                key={emoji}
                                className={`${styles.reactionOption} ${myReaction === emoji ? styles.reactionOptionActive : ''}`}
                                onClick={() => handlePick(emoji)}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                {hasReaction && (
                    <button className={styles.reactionBadge} onClick={togglePicker}>
                        {message.sender_reaction && <span>{message.sender_reaction}</span>}
                        {message.receiver_reaction && <span>{message.receiver_reaction}</span>}
                    </button>
                )}
            </div>
        </div>
    );
}

export default memo(MessageBubble);
