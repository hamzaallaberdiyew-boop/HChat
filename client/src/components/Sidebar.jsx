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

    /*
     * Keep changing values in refs so the socket listener doesn't need
     * to be constantly recreated whenever the selected chat changes.
     */
    const onlineUserIdsRef = useRef(onlineUserIds);
    const selectedUserIdRef = useRef(selectedUserId);

    onlineUserIdsRef.current = onlineUserIds;
    selectedUserIdRef.current = selectedUserId;

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
                    setSearchError(data.error || "Search failed");
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
                    online: onlineUserIdsRef.current.has(
                        Number(user.id)
                    ),
                    unread_count: Number(user.unread_count) || 0
                }));

                setUsers(usersWithOnline);
            } catch (err) {
                console.error(
                    "Failed to fetch conversations:",
                    err
                );
            }
        }

        fetchConversations();
    }, [refreshUsers]);

    // ---------------------------------------------------------
    // UPDATE ONLINE STATUS
    // ---------------------------------------------------------

    useEffect(() => {
        setUsers((prevUsers) =>
            prevUsers.map((user) => ({
                ...user,
                online: onlineUserIds.has(Number(user.id))
            }))
        );
    }, [onlineUserIds]);

    // ---------------------------------------------------------
    // CLEAR UNREAD COUNT WHEN PARENT SAYS CONVERSATION IS READ
    // ---------------------------------------------------------

    useEffect(() => {
        if (readConversationId == null) return;

        setUsers((prevUsers) =>
            prevUsers.map((user) =>
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
    // MARK CONVERSATION AS READ
    // ---------------------------------------------------------

    const markConversationAsRead = useCallback(async (userId) => {
        try {
            const token = localStorage.getItem("token");

            await fetch(
                `${process.env.REACT_APP_API_URL}/api/messages/${userId}/read`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
        } catch (err) {
            console.error(
                "Failed to mark conversation as read:",
                err
            );
        }
    }, []);

    // ---------------------------------------------------------
    // HANDLE MESSAGE
    // ---------------------------------------------------------

    const applyMessageUpdate = useCallback(
        (message) => {
            if (!myId || !message) return;

            const currentUserId = Number(myId);
            const senderId = Number(message.sender_id);
            const receiverId = Number(message.receiver_id);

            /*
             * Figure out who this conversation belongs to.
             *
             * If I sent it:
             *     other user = receiver
             *
             * If they sent it:
             *     other user = sender
             */
            const otherUserId =
                senderId === currentUserId
                    ? receiverId
                    : senderId;

            const isFromThem =
                senderId !== currentUserId;

            const currentlyOpenUserId = Number(
                selectedUserIdRef.current
            );

            const isConversationCurrentlyOpen =
                otherUserId === currentlyOpenUserId;

            setUsers((prevUsers) => {
                const existingUser = prevUsers.find(
                    (user) =>
                        Number(user.id) === Number(otherUserId)
                );

                /*
                 * IMPORTANT:
                 *
                 * If this conversation is currently open,
                 * its unread count MUST be zero.
                 *
                 * Otherwise, if the message came from the other
                 * person, increment the unread count.
                 */
                let unreadCount =
                    Number(existingUser?.unread_count) || 0;

                if (isFromThem) {
                    if (isConversationCurrentlyOpen) {
                        unreadCount = 0;
                    } else {
                        unreadCount += 1;
                    }
                }

                const updatedUser = {
                    ...(existingUser || {
                        id: otherUserId,
                        username:
                            message.sender_username ||
                            "New chat",
                        online: true
                    }),

                    last_message: message.content,
                    last_message_time: message.sent_time,
                    sender_id: message.sender_id,
                    unread_count: unreadCount
                };

                /*
                 * Put this conversation at the top.
                 */
                const remainingUsers = prevUsers.filter(
                    (user) =>
                        Number(user.id) !==
                        Number(otherUserId)
                );

                return [updatedUser, ...remainingUsers];
            });

            /*
             * If the message came from the other person while
             * their conversation is currently open, mark it read
             * on the server as well.
             */
            if (
                isFromThem &&
                isConversationCurrentlyOpen
            ) {
                markConversationAsRead(otherUserId);
            }
        },
        [myId, markConversationAsRead]
    );

    // ---------------------------------------------------------
    // SOCKET MESSAGE LISTENER
    // ---------------------------------------------------------

    useEffect(() => {
        if (!myId) return;

        socket.on(
            "receiveMessage",
            applyMessageUpdate
        );

        return () => {
            socket.off(
                "receiveMessage",
                applyMessageUpdate
            );
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
    // OPEN CONVERSATION
    // ---------------------------------------------------------

    async function handleClick(user) {
        const userId = Number(user.id);

        /*
         * Update the ref immediately.
         *
         * This is important because socket messages can arrive
         * immediately after switching conversations.
         */
        selectedUserIdRef.current = userId;

        /*
         * Clear the badge immediately in the UI.
         */
        setUsers((prevUsers) =>
            prevUsers.map((u) =>
                Number(u.id) === userId
                    ? {
                          ...u,
                          unread_count: 0
                      }
                    : u
            )
        );

        /*
         * Tell the backend that all messages in this conversation
         * have been read.
         */
        await markConversationAsRead(userId);

        /*
         * Tell the parent to actually open the conversation.
         */
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
                onChange={(e) =>
                    setSearch(e.target.value)
                }
            />

            <div className={styles.userList}>
                {searchError && (
                    <p className={styles.searchError}>
                        {searchError}
                    </p>
                )}

                {(search ? searchResults : users).map(
                    (user) => {
                        const isSelected =
                            Number(user.id) ===
                            Number(selectedUserId);

                        const unreadCount =
                            Number(user.unread_count) || 0;

                        return (
                            <div
                                key={user.id}
                                className={
                                    isSelected
                                        ? `${styles.chatName} ${styles.chatNameActive}`
                                        : styles.chatName
                                }
                                onClick={() =>
                                    handleClick(user)
                                }
                            >
                                <div
                                    className={
                                        styles.avatarWrapper
                                    }
                                >
                                    <div
                                        className={
                                            styles.avatar
                                        }
                                    >
                                        {user.username
                                            ? user.username[0].toUpperCase()
                                            : "?"}
                                    </div>

                                    {user.online && (
                                        <div
                                            className={
                                                styles.onlineDot
                                            }
                                        />
                                    )}
                                </div>

                                <div
                                    className={
                                        styles.nameBlock
                                    }
                                >
                                    <div
                                        className={
                                            styles.nameRow
                                        }
                                    >
                                        <span
                                            className={
                                                styles.name
                                            }
                                        >
                                            {user.username}
                                        </span>

                                        {unreadCount > 0 && (
                                            <span
                                                className={
                                                    styles.unreadBadge
                                                }
                                            >
                                                {unreadCount >
                                                9
                                                    ? "9+"
                                                    : unreadCount}
                                            </span>
                                        )}
                                    </div>

                                    {user.last_message && (
                                        <span
                                            className={
                                                styles.preview
                                            }
                                        >
                                            <strong>
                                                {Number(
                                                    user.sender_id
                                                ) ===
                                                Number(myId)
                                                    ? "Me"
                                                    : user.username}
                                                :
                                            </strong>{" "}
                                            {user.last_message
                                                .length > 40
                                                ? user.last_message.slice(
                                                      0,
                                                      40
                                                  ) + "…"
                                                : user.last_message}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    }
                )}
            </div>
        </div>
    );
}

export default Sidebar;