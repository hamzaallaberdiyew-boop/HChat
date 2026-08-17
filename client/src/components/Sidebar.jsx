import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./Sidebar.module.css";
import socket from "../socket";

function Sidebar(props) {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchError, setSearchError] = useState("");

    const token = localStorage.getItem("token");
    const myId = token ? JSON.parse(atob(token.split(".")[1])).id : null;

    const {
        onlineUserIds,
        refreshUsers,
        incomingMessage,
        onSelectUser,
        selectedUserId,
        readConversationId
    } = props;

    // Keep the latest online user IDs available to the conversation fetch
    // without making the fetch run every time presence changes.
    const onlineUserIdsRef = useRef(onlineUserIds);
    onlineUserIdsRef.current = onlineUserIds;

    // ---------------------------------------------------------
    // SEARCH USERS
    // ---------------------------------------------------------
    useEffect(() => {
        if (!search.trim()) {
            setSearchResults([]);
            setSearchError("");
            return;
        }

        const controller = new AbortController();

        async function searchUsers() {
            try {
                const token = localStorage.getItem("token");

                const response = await fetch(
                    `${process.env.REACT_APP_API_URL}/api/users/search?username=${encodeURIComponent(search)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        },
                        signal: controller.signal
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    setSearchError(data.error);
                    setSearchResults([]);
                } else {
                    setSearchResults(data);
                    setSearchError("");
                }
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error("Search error:", err);
                }
            }
        }

        searchUsers();

        return () => controller.abort();
    }, [search]);

    // ---------------------------------------------------------
    // FETCH CONVERSATIONS
    // ---------------------------------------------------------
    useEffect(() => {
        async function fetchConversations() {
            try {
                const token = localStorage.getItem("token");

                const response = await fetch(
                    `${process.env.REACT_APP_API_URL}/api/messages/conversations/latest`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    console.error(
                        "Failed to fetch conversations:",
                        data.error
                    );
                    return;
                }

                const usersWithOnline = data.map((user) => ({
                    ...user,
                    online: onlineUserIdsRef.current.has(user.id),
                    unread_count: Number(user.unread_count) || 0
                }));

                setUsers(usersWithOnline);
            } catch (err) {
                console.error("Failed to fetch conversations:", err);
            }
        }

        fetchConversations();
    }, [refreshUsers]);

    // ---------------------------------------------------------
    // UPDATE ONLINE STATUS
    // ---------------------------------------------------------
    useEffect(() => {
        setUsers((prev) =>
            prev.map((user) => ({
                ...user,
                online: onlineUserIds.has(user.id)
            }))
        );
    }, [onlineUserIds]);

    // ---------------------------------------------------------
    // MARK CONVERSATION AS READ
    // ---------------------------------------------------------
    useEffect(() => {
        if (!readConversationId) return;

        setUsers((prev) =>
            prev.map((user) =>
                Number(user.id) === Number(readConversationId)
                    ? {
                          ...user,
                          unread_count: 0
                      }
                    : user
            )
        );
    }, [readConversationId]);

    // ---------------------------------------------------------
    // HANDLE MESSAGE UPDATE
    // ---------------------------------------------------------
    const applyMessageUpdate = useCallback(
        (message) => {
            if (!myId || !message) return;

            const senderId = Number(message.sender_id);
            const receiverId = Number(message.receiver_id);
            const currentUserId = Number(myId);
            const currentSelectedUserId = Number(selectedUserId);

            // Determine who the conversation is with.
            const otherUserId =
                senderId === currentUserId ? receiverId : senderId;

            const isFromThem = senderId !== currentUserId;

            // Is this message from/to the conversation currently open?
            const isConversationCurrentlyOpen =
                otherUserId === currentSelectedUserId;

            // -------------------------------------------------
            // MESSAGE IS BEING RECEIVED WHILE CHAT IS OPEN
            // -------------------------------------------------
            if (isFromThem && isConversationCurrentlyOpen) {
                const token = localStorage.getItem("token");

                fetch(
                    `${process.env.REACT_APP_API_URL}/api/messages/${otherUserId}/read`,
                    {
                        method: "PATCH",
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                ).catch((err) =>
                    console.error("Auto mark-as-read failed:", err)
                );
            }

            // -------------------------------------------------
            // UPDATE SIDEBAR
            // -------------------------------------------------
            setUsers((prevUsers) => {
                const existing = prevUsers.find(
                    (user) =>
                        Number(user.id) === Number(otherUserId)
                );

                let unreadCount = Number(existing?.unread_count) || 0;

                /*
                 * IMPORTANT:
                 *
                 * If the conversation is currently open, the message
                 * has effectively been read, so the sidebar MUST show 0.
                 *
                 * Otherwise, if the message is from the other person,
                 * increment the unread count.
                 */
                if (isConversationCurrentlyOpen) {
                    unreadCount = 0;
                } else if (isFromThem) {
                    unreadCount += 1;
                }

                const updatedUser = {
                    ...(existing || {
                        id: otherUserId,
                        username:
                            message.sender_username || "New chat",
                        online: true,
                        unread_count: 0
                    }),

                    last_message: message.content,
                    last_message_time: message.sent_time,
                    sender_id: message.sender_id,

                    // The important part:
                    unread_count: unreadCount
                };

                // Move this conversation to the top.
                const withoutThisUser = prevUsers.filter(
                    (user) =>
                        Number(user.id) !== Number(otherUserId)
                );

                return [updatedUser, ...withoutThisUser];
            });
        },
        [myId, selectedUserId]
    );

    // ---------------------------------------------------------
    // SOCKET MESSAGE LISTENER
    // ---------------------------------------------------------
    useEffect(() => {
        if (!myId) return;

        socket.on("receiveMessage", applyMessageUpdate);

        return () => {
            socket.off("receiveMessage", applyMessageUpdate);
        };
    }, [myId, applyMessageUpdate]);

    // ---------------------------------------------------------
    // INCOMING MESSAGE PROP
    // ---------------------------------------------------------
    useEffect(() => {
        if (!incomingMessage) return;

        applyMessageUpdate(incomingMessage);
    }, [incomingMessage, applyMessageUpdate]);

    // ---------------------------------------------------------
    // SELECT USER
    // ---------------------------------------------------------
    function handleClick(user) {
        // Immediately clear the unread badge locally when opening
        // the conversation.
        setUsers((prev) =>
            prev.map((u) =>
                Number(u.id) === Number(user.id)
                    ? {
                          ...u,
                          unread_count: 0
                      }
                    : u
            )
        );

        onSelectUser(user);
    }

    // ---------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------
    return (
        <div className={styles.div}>
            <input
                type="search"
                value={search}
                className={styles.searchBar}
                id="site-search"
                name="q"
                placeholder="Search"
                aria-label="Search through site content"
                onChange={(e) => setSearch(e.target.value)}
            />

            <div className={styles.userList}>
                {searchError && (
                    <p className={styles.searchError}>
                        {searchError}
                    </p>
                )}

                {(search ? searchResults : users).map((user) => (
                    <div
                        key={user.id}
                        className={
                            Number(user.id) === Number(selectedUserId)
                                ? `${styles.chatName} ${styles.chatNameActive}`
                                : styles.chatName
                        }
                        onClick={() => handleClick(user)}
                    >
                        <div className={styles.avatarWrapper}>
                            <div className={styles.avatar}>
                                {user.username
                                    ? user.username[0]
                                    : "?"}
                            </div>

                            {user.online && (
                                <div
                                    className={styles.onlineDot}
                                ></div>
                            )}
                        </div>

                        <div className={styles.nameBlock}>
                            <div className={styles.nameRow}>
                                <span className={styles.name}>
                                    {user.username}
                                </span>

                                {Number(user.unread_count) > 0 && (
                                    <span
                                        className={
                                            styles.unreadBadge
                                        }
                                    >
                                        {Number(user.unread_count) >
                                        9
                                            ? "9+"
                                            : Number(
                                                  user.unread_count
                                              )}
                                    </span>
                                )}
                            </div>

                            {user.last_message && (
                                <span className={styles.preview}>
                                    <strong>
                                        {Number(user.sender_id) ===
                                        Number(myId)
                                            ? "Me"
                                            : user.username}
                                        :
                                    </strong>{" "}
                                    {user.last_message.length > 40
                                        ? user.last_message.slice(
                                              0,
                                              40
                                          ) + "…"
                                        : user.last_message}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Sidebar;