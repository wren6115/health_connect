import { useState } from 'react';
import './Contact.css';

function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });

    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setFormData({
                name: '',
                email: '',
                phone: '',
                subject: '',
                message: ''
            });
        }, 3000);
    };

    return (
        <div className="contact section-padding">
            <div className="container">
                <div className="section-header text-center mb-xl">
                    <h2 className="section-title">Get in Touch</h2>
                    <p className="section-subtitle">
                        Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                    </p>
                </div>

                <div className="contact-wrapper">
                    {/* Contact Info */}
                    <div className="contact-info">
                        <h3 className="contact-info-title">Contact Information</h3>
                        <p className="contact-info-subtitle">
                            Reach out to us through any of these channels
                        </p>

                        <div className="contact-methods">
                            <div className="contact-method">
                                <div className="method-icon">📧</div>
                                <div className="method-details">
                                    <h4>Email</h4>
                                    <p>support@healthconnect.com</p>
                                </div>
                            </div>

                            <div className="contact-method">
                                <div className="method-icon">📞</div>
                                <div className="method-details">
                                    <h4>Phone</h4>
                                    <p>+1 (555) 123-4567</p>
                                </div>
                            </div>

                            <div className="contact-method">
                                <div className="method-icon">📍</div>
                                <div className="method-details">
                                    <h4>Address</h4>
                                    <p>123 Healthcare Ave, Medical District, NY 10001</p>
                                </div>
                            </div>

                            <div className="contact-method">
                                <div className="method-icon">🕒</div>
                                <div className="method-details">
                                    <h4>Working Hours</h4>
                                    <p>Mon - Fri: 8:00 AM - 8:00 PM</p>
                                    <p>Sat - Sun: 9:00 AM - 5:00 PM</p>
                                </div>
                            </div>
                        </div>

                        <div className="social-links">
                            <h4>Follow Us</h4>
                            <div className="social-icons">
                                <a href="#" className="social-icon">📘</a>
                                <a href="#" className="social-icon">🐦</a>
                                <a href="#" className="social-icon">📷</a>
                                <a href="#" className="social-icon">💼</a>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="contact-form-wrapper">
                        {submitted ? (
                            <div className="success-message">
                                <div className="success-icon">✅</div>
                                <h3>Thank You!</h3>
                                <p>Your message has been sent successfully. We'll get back to you soon.</p>
                            </div>
                        ) : (
                            <form className="contact-form" onSubmit={handleSubmit}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="name">Full Name *</label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            className="form-input"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            placeholder="John Doe"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label" htmlFor="email">Email Address *</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            className="form-input"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="phone">Phone Number</label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            className="form-input"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label" htmlFor="subject">Subject *</label>
                                        <select
                                            id="subject"
                                            name="subject"
                                            className="form-select"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Select a subject</option>
                                            <option value="general">General Inquiry</option>
                                            <option value="appointment">Appointment Question</option>
                                            <option value="technical">Technical Support</option>
                                            <option value="billing">Billing Question</option>
                                            <option value="feedback">Feedback</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="message">Message *</label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        className="form-textarea"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        placeholder="Tell us how we can help you..."
                                    ></textarea>
                                </div>

                                <button type="submit" className="btn btn-primary btn-submit">
                                    Send Message
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Contact;
