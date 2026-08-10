import { Navigate } from 'react-router-dom';

function PublicRoute({ children }) {
    const token = localStorage.getItem('token');

    if (token) {
        return <Navigate to="/chat" replace />;
    }

    return children;
}

export default PublicRoute;