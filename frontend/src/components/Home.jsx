import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
    const navigate = useNavigate();
    const features = [
        {
            icon: '🏥',
            title: 'Expert Doctors',
            description: 'Connect with certified healthcare professionals from various specialties'
        },
        {
            icon: '📹',
            title: 'Video Consultations',
            description: 'Get medical advice from the comfort of your home through secure video calls'
        },
        {
            icon: '📅',
            title: 'Easy Scheduling',
            description: 'Book appointments instantly with our simple and intuitive booking system'
        },
        {
            icon: '💊',
            title: 'Digital Prescriptions',
            description: 'Receive and manage your prescriptions digitally for easy access'
        },
        {
            icon: '📊',
            title: 'Health Records',
            description: 'Keep track of your medical history and health statistics in one place'
        },
        {
            icon: '🔒',
            title: 'Secure & Private',
            description: 'Your health data is protected with enterprise-grade security'
        }
    ];

    return (
        <div className="home">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-overlay"></div>
                <div className="container">
                    <div className="hero-content animate-fadeInUp">
                        <h1 className="hero-title">
                            Your Health, <span >Connected</span>
                        </h1>
                        <p className="hero-subtitle">
                            Experience healthcare reimagined. Connect with top doctors, schedule appointments,
                            and manage your health journey - all in one platform.
                        </p>
                        <div className="hero-buttons">
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/appointment')}
                            >
                                Book Appointment
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={() => navigate('/videocall')}
                            >
                                Start Video Call
                            </button>
                        </div>
                        <div className="hero-stats">
                            <div className="stat-item">
                                <div className="stat-number">500+</div>
                                <div className="stat-label">Expert Doctors</div>
                            </div>
                            <div className="stat-divider"></div>
                            <div className="stat-item">
                                <div className="stat-number">50k+</div>
                                <div className="stat-label">Happy Patients</div>
                            </div>
                            <div className="stat-divider"></div>
                            <div className="stat-item">
                                <div className="stat-number">24/7</div>
                                <div className="stat-label">Support Available</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="hero-decoration">
                    <div className="decoration-circle circle-1"></div>
                    <div className="decoration-circle circle-2"></div>
                    <div className="decoration-circle circle-3"></div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features section-padding">
                <div className="container">
                    <div className="section-header text-center mb-xl">
                        <h2 className="section-title">Why Choose HealthConnect?</h2>
                        <p className="section-subtitle">
                            We provide comprehensive healthcare solutions designed for your convenience
                        </p>
                    </div>
                    <div className="grid grid-3">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="feature-card card"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className="feature-icon">{feature.icon}</div>
                                <h3 className="feature-title">{feature.title}</h3>
                                <p className="feature-description">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section section-padding">
                <div className="container">
                    <div className="cta-card">
                        <div className="cta-content">
                            <h2 className="cta-title">Ready to Get Started?</h2>
                            <p className="cta-subtitle">
                                Book your first appointment today and experience the future of healthcare
                            </p>
                            <button
                                className="btn btn-primary btn-large"
                                onClick={() => navigate('/appointment')}
                            >
                                Book an Appointment Now
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;
