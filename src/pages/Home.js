import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import ImageCarousel from '../components/ImageCarousel';
import SellNowButton from '../components/SellNowButton';
import buyerSellerImage from '../assets/buyer+seller+damaged car.png';
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
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 5 photos
    if (files.length + photos.length > 5) {
      alert('You can only upload a maximum of 5 photos.');
      return;
    }
    
    // Check file sizes (limit to 5MB each)
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert('Each photo must be smaller than 5MB.');
      return;
    }
    
    // Check file types
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      alert('Please only upload image files.');
      return;
    }
    
    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
    setPhotos(prevPhotos => [...prevPhotos, ...files]);
  };

  const removePhoto = (index) => {
    // Clean up the preview URL
    URL.revokeObjectURL(photoPreviews[index]);
    
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    setPhotos(prevPhotos => prevPhotos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Form submitted:', formData);
    console.log('Photos uploaded:', photos);
    
    // Clean up preview URLs
    photoPreviews.forEach(preview => URL.revokeObjectURL(preview));
    
    // In a real application, you would send the data to your backend like this:
    /*
    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    formDataToSend.append('phone', formData.phone);
    formDataToSend.append('email', formData.email);
    formDataToSend.append('make', formData.make);
    formDataToSend.append('model', formData.model);
    formDataToSend.append('year', formData.year);
    formDataToSend.append('condition', formData.condition);
    
    // Add each photo to the form data
    photos.forEach((photo, index) => {
      formDataToSend.append(`photos[${index}]`, photo);
    });
    
    // Send to your backend API
    fetch('/api/quote', {
      method: 'POST',
      body: formDataToSend,
    })
    .then(response => response.json())
    .then(data => {
      console.log('Success:', data);
      alert('Thank you for your submission! We will contact you shortly.');
    })
    .catch(error => {
      console.error('Error:', error);
      alert('There was an error submitting your request. Please try again.');
    });
    */
    
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
    setPhotos([]);
    setPhotoPreviews([]);
    setIsSubmitting(false);
  };

  return (
    <div className="home">
      <Navigation />
      <SellNowButton />
      
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Sell Your Damaged Car in New Zealand – Fast, Easy, Cash Paid</h1>
          <p>We buy cars in any condition. Free pickup, instant payment, no hassle.</p>
          <div className="hero-actions">
            <button 
              className="btn btn-accent btn-lg hero-cta"
              onClick={() => document.querySelector('.car-form-section').scrollIntoView({ behavior: 'smooth' })}
            >
              Get My Quote Now
            </button>
            <button 
              className="btn btn-outline btn-lg hero-cta-secondary"
              onClick={() => document.querySelector('#how-it-works').scrollIntoView({ behavior: 'smooth' })}
            >
              How It Works
            </button>
          </div>
          <ImageCarousel />
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
            <div className="form-group">
              <label htmlFor="photos" className="file-upload-label">
                Upload Photos of Your Car (Optional)
                <span className="file-upload-note"> - Help us assess your car's condition (max 5 photos, 5MB each)</span>
              </label>
              <input
                type="file"
                id="photos"
                name="photos"
                accept="image/*"
                onChange={handlePhotoChange}
                multiple
              />
              <div className="photo-preview">
                {photos.length > 0 ? (
                  <>
                    <p>{photos.length} photo(s) selected</p>
                    <div className="photo-thumbnails">
                      {photoPreviews.map((preview, index) => (
                        <div key={index} className="photo-thumbnail">
                          <img src={preview} alt={`Preview ${index}`} className="thumbnail-image" />
                          <button 
                            type="button" 
                            className="remove-photo-btn"
                            onClick={() => removePhoto(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="no-photos">No photos selected. Upload images to help us assess your car.</p>
                )}
              </div>
            </div>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="loading-spinner"></span>
                  Processing...
                </>
              ) : (
                'Get My Quote'
              )}
            </button>
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