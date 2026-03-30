import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hello! I am the HealthConnect assistant. How are you feeling today? Please describe your symptoms.", isBot: true }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { text: input, isBot: false };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const { data } = await api.post('/symptoms', { message: userMsg.text });

            let botReply = '';
            if (data.severity === 'high') {
                botReply = `Based on your symptoms (${data.detectedSymptoms.join(', ')}), this is considered a HIGH severity alert. A notification has been sent to the on-call doctor immediately.`;
            } else if (data.severity === 'medium') {
                botReply = `I've noted your symptoms (${data.detectedSymptoms.join(', ')}). A doctor will review your case shortly.`;
            } else {
                botReply = "Thank you for the update. Your report has been logged.";
            }

            botReply += "\n\nDisclaimer: This chatbot does not provide medical diagnosis. Please consult a doctor.";

            setMessages(prev => [...prev, { text: botReply, isBot: true }]);
        } catch (error) {
            console.error('Chatbot error:', error);
            setMessages(prev => [...prev, { text: "Sorry, I couldn't process that right now. Please try again.", isBot: true }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg focus:outline-none flex items-center justify-center transform transition hover:scale-105"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                </button>
            )}

            {isOpen && (
                <div className="bg-white rounded-lg shadow-xl w-80 sm:w-96 flex flex-col h-[500px] border border-blue-100 overflow-hidden transform transition-all duration-300 origin-bottom-right">
                    {/* Header */}
                    <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                            <span className="font-semibold">Health Assistant</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-blue-100 hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col space-y-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg ${msg.isBot ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm' : 'bg-blue-600 text-white rounded-br-none shadow-sm'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white border text-gray-500 border-gray-200 p-3 rounded-lg rounded-bl-none shadow-sm flex space-x-1">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 flex space-x-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your symptoms..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                        >
                            Send
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
