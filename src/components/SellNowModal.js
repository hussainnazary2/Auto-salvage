import React, { useState } from 'react';
import './SellNowModal.css';

const SellNowModal = ({ isOpen, onClose }) => {
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

  const handleSubmit = (e) => {
    e.preventDefault();
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
    
    // Close the modal
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="sell-now-modal-overlay" onClick={onClose}>
      <div className="sell-now-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Get a Quote for Your Car</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
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
            <button type="submit" className="submit-btn">Get My Quote</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SellNowModal;