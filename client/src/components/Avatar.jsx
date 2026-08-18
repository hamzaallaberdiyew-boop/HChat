// src/components/Avatar.jsx
import { AVATAR_ICONS } from '../constants/avatarOptions';

function Avatar({ user, size = 40 }) {
    const iconData = AVATAR_ICONS.find(i => i.id === user.avatar_icon);
    const backgroundColor = user.avatar_color || '#4f5fae';

    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                backgroundColor,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: size * 0.45,
                fontWeight: 600
            }}
        >
            {iconData ? iconData.emoji : user.username[0].toUpperCase()}
        </div>
    );
}

export default Avatar;