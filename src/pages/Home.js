import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import buyerSellerImage from '../assets/buyer+seller+damaged car.png';
import damagedCarImage from '../assets/damaged car on truck.png';
import './Home.css';

const Home = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    make: '',
    model: '',
    year: '',
    condition: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Thank you for your submission! We will contact you shortly.');
    // Reset form
    setFormData({
      name: '',
      phone: '',
      email: '',
      make: '',
      model: '',
      year: '',
      condition: ''
    });
  };

  return (
    <div className="home">
      <Navigation />
      
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Sell Your Damaged Car in New Zealand – Fast, Easy, Cash Paid</h1>
          <p>We buy cars in any condition. Free pickup, instant payment, no hassle.</p>
          <img src={damagedCarImage} alt="Damaged car on truck" className="hero-image" />
        </div>
      </section>

      {/* Car Submission Form */}
      <section className="car-form-section">
        <div className="container">
          <h2>Get a Quote for Your Car</h2>
          <form onSubmit={handleSubmit} className="car-form">
            <div className="form-group">
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <input
                  type="text"
                  name="make"
                  placeholder="Car Make"
                  value={formData.make}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  name="model"
                  placeholder="Car Model"
                  value={formData.model}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <input
                  type="number"
                  name="year"
                  placeholder="Year"
                  value={formData.year}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Condition</option>
                  <option value="Running">Running</option>
                  <option value="Not Running">Not Running</option>
                  <option value="Parted Out">Parted Out</option>
                  <option value="Scrap">Scrap</option>
                </select>
              </div>
            </div>
            <button type="submit" className="submit-btn">Get My Quote</button>
          </form>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Submit Your Details</h3>
              <p>Fill out our simple form with your car details and contact information.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Get a Quote</h3>
              <p>We'll review your car details and provide a fair cash offer.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Get Paid</h3>
              <p>We'll pick up your car for free and pay you instantly in cash.</p>
            </div>
          </div>
          <div className="section-image">
            <img src={buyerSellerImage} alt="Buyer and seller with damaged car" />
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="why-choose-us" className="why-choose-us">
        <div className="container">
          <h2>Why Choose Us</h2>
          <div className="features">
            <div className="feature">
              <h3>Fast & Easy Process</h3>
              <p>Get a quote in minutes and sell your car the same day.</p>
            </div>
            <div className="feature">
              <h3>Best Prices Guaranteed</h3>
              <p>We offer competitive prices for cars in any condition.</p>
            </div>
            <div className="feature">
              <h3>Free Pickup Nationwide</h3>
              <p>We'll pick up your car anywhere in New Zealand at no cost to you.</p>
            </div>
            <div className="feature">
              <h3>Instant Cash Payment</h3>
              <p>Get paid immediately when we collect your vehicle.</p>
            </div>
          </div>
          <div className="section-image">
            <img src={buyerSellerImage} alt="Buyer and seller with damaged car" />
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about-us" className="about-us">
        <div className="container">
          <h2>About Us</h2>
          <p>
            We are New Zealand's leading damaged car buying service, helping thousands of 
            Kiwis turn their unwanted vehicles into cash. Whether your car is running or 
            not, we buy all makes and models in any condition. Our hassle-free process 
            means you get a fair price without the stress of selling privately.
          </p>
          <p>
            With over 10 years of experience in the automotive industry, our team of 
            professionals ensures a smooth and transparent transaction every time. 
            We handle all paperwork and provide free pickup services nationwide.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Home;