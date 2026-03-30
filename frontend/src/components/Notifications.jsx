import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Notifications = () => {
    const { user } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            if (!user) return;
            try {
                const { data } = await api.get('/notifications');
                setNotifications(data);
            } catch (err) {
                console.error("Failed to fetch notifications", err);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, [user]);

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
        } catch (err) {
            console.error(err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="text-center py-6">Loading notifications...</div>;

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="max-w-3xl mx-auto my-8 p-6 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Your Notifications</h2>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <p className="text-gray-500 text-center py-8">You have no notifications.</p>
            ) : (
                <ul className="divide-y divide-gray-200">
                    {notifications.map(notif => (
                        <li
                            key={notif._id}
                            className={`py-4 px-4 rounded-md mb-2 flex justify-between items-start transition ${notif.read ? 'bg-white' : 'bg-blue-50 border-l-4 border-blue-500'}`}
                        >
                            <div>
                                <p className={`text-sm ${notif.read ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>
                                    {notif.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {new Date(notif.createdAt).toLocaleString()}
                                </p>
                            </div>
                            {!notif.read && (
                                <button
                                    onClick={() => markAsRead(notif._id)}
                                    className="text-xs bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-100 flex-shrink-0 ml-4"
                                >
                                    Mark Read
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Notifications;
