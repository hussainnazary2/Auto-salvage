import React, { useState, useEffect } from 'react';
import './ImageCarousel.css';
import damagedCarImage from '../assets/damaged car on truck.png';
import buyerSellerImage from '../assets/buyer+seller+damaged car.png';
import chatGptImage1 from '../assets/ChatGPT Image Sep 16, 2025, 04_53_57 PM.png';
import chatGptImage2 from '../assets/ChatGPT Image Sep 16, 2025, 05_48_18 PM.png';
import image1 from '../assets/image (1).jpg';
import image2 from '../assets/image (2).jpg';

const ImageCarousel = () => {
  const images = [
    { src: buyerSellerImage, alt: 'Buyer and seller with damaged car' },
    { src: chatGptImage2, alt: 'Car evaluation' },
    { src: damagedCarImage, alt: 'Damaged car on truck' },
    { src: chatGptImage1, alt: 'Car buying service' },
    { src: image1, alt: 'Damaged car' },
    { src: image2, alt: 'Car inspection' }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance the carousel every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
    }, 4000); // 4 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="carousel-container">
      <div className="carousel">
        <div 
          className="carousel-track" 
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {images.map((image, index) => (
            <div key={index} className="carousel-slide">
              <img src={image.src} alt={image.alt} />
            </div>
          ))}
        </div>
      </div>
      <div className="carousel-dots">
        {images.map((_, index) => (
          <span
            key={index}
            className={`dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;