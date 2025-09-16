import React, { useState } from 'react';
import SellNowModal from './SellNowModal';
import './SellNowButton.css';

const SellNowButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button className="sell-now-floating-button" onClick={openModal}>
        <span className="money-icon">💰</span>
        Sell Now
      </button>
      <SellNowModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
};

export default SellNowButton;