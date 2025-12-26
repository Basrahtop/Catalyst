import React, { useState, useEffect } from 'react';
// We'll re-use the App.css file
import './App.css'; 

function OpportunityDetail({ opportunityId, onBack }) {
  
  const [details, setDetails] = useState(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [isFunding, setIsFunding] = useState(false);
  const [message, setMessage] = useState('');

  // --- NEW STATE FOR DECLINE MODAL ---
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);

  
  const formatNaira = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  useEffect(() => {
    const API_URL = `http://localhost:3001/bank/opportunities/${opportunityId}`;
    async function fetchDetails() {
      setIsLoading(true);
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        setDetails(data); 
      } catch (error) {
        console.error("Failed to fetch details:", error);
      } finally {
        setIsLoading(false); 
      }
    }
    fetchDetails();
  }, [opportunityId]); 

  // --- This is our "FUND" function (unchanged) ---
  const handleFundRequest = async () => {
    setIsFunding(true);
    setMessage('Processing funding...');
    const API_URL = `http://localhost:3001/bank/opportunities/${opportunityId}/fund`;
    // ... (rest of this function is the same as before) ...
    try {
      const response = await fetch(API_URL, { method: 'POST' });
      if (!response.ok) { throw new Error('Server error'); }
      const result = await response.json();
      if (result.status === 'approved') {
        setMessage('Success! Funding approved.');
        setDetails(prevDetails => ({
          ...prevDetails,
          request: result.updatedRequest 
        }));
        setIsFunding(false);
        setTimeout(() => { setMessage(''); }, 3000);
      } else {
        throw new Error('Funding was not approved');
      }
    } catch (error) {
      console.error("Failed to fund opportunity:", error);
      setMessage('Error: Could not approve funding. Please try again.');
      setIsFunding(false);
    }
  };

  // --- NEW "DECLINE" FUNCTION ---
  const handleDeclineRequest = async () => {
    if (!declineReason) {
      alert("Please provide a reason for declining.");
      return;
    }
    
    setIsDeclining(true);
    setMessage('Processing decline...');
    
    const API_URL = `http://localhost:3001/bank/opportunities/${opportunityId}/decline`;
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: declineReason })
      });
      
      if (!response.ok) { throw new Error('Server error'); }

      const result = await response.json();
      
      if (result.status === 'declined') {
        setMessage('Success! Request declined. Returning to list...');
        // Wait 2 seconds, then go back to the main list
        setTimeout(() => {
          onBack();
        }, 2000);
      } else {
        throw new Error('Decline was not processed');
      }
      
    } catch (error) {
      console.error("Failed to decline opportunity:", error);
      setMessage('Error: Could not decline. Please try again.');
      setIsDeclining(false);
    }
  };


  if (isLoading) {
    return <div className="detail-view">Loading details...</div>;
  }
  if (!details) {
    return <div className="detail-view">Could not load opportunity details.</div>;
  }
  
  // --- NEW: THE DECLINE MODAL ---
  // If the 'showDeclineModal' state is true, we show this modal instead
  if (showDeclineModal) {
    return (
      <div className="modal-backdrop">
        <div className="modal-content">
          <h2>Decline Request</h2>
          <p>You are declining the request for <strong>{formatNaira(details.request.amount)}</strong>.</p>
          <label htmlFor="declineReason">
            <strong>Reason for Decline (Required)</strong>
          </label>
          <textarea
            id="declineReason"
            className="modal-textarea"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="e.g., Incomplete documentation, high risk..."
          />
          <div className="modal-buttons">
            <button 
              className="modal-button-cancel"
              onClick={() => setShowDeclineModal(false)}
              disabled={isDeclining}
            >
              Cancel
            </button>
            <button 
              className="modal-button-decline"
              onClick={handleDeclineRequest}
              disabled={isDeclining}
            >
              {isDeclining ? 'Declining...' : 'Submit Decline'}
            </button>
          </div>
          {message && (
            <p className="funding-message" style={{ color: message.startsWith('Error') ? 'red' : 'black' }}>
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // --- This is the Normal Detail View ---
  return (
    <div className="detail-view">
      <button onClick={onBack} className="back-button">&larr; Back to List</button>
      
      <h2>{details.request.purpose}</h2>
      <p className="detail-sme-name">For: {details.sme.businessName}</p>
      
      <div className="detail-grid">
        {/* Left Column: The Request */}
        <div className="detail-card">
          <h3>Funding Request</h3>
          <p><strong>Amount:</strong> {formatNaira(details.request.amount)}</p>
          <p><strong>Term:</strong> {details.request.term}</p>
          <p><strong>Purpose:</strong> {details.request.purpose}</p>
          <p><strong>Status:</strong> {details.request.status}</p>
          
          {/* We now show a message if it's already declined */}
          {details.request.status === 'approved' && (
            <button className="fund-button-disabled" disabled>
              Already Funded
            </button>
          )}
          
          {details.request.status === 'declined' && (
            <button className="decline-button-disabled" disabled>
              Already Declined
            </button>
          )}

          {/* This part shows the buttons only if it's "pending" */}
          {details.request.status === 'pending' && (
            <div className="action-buttons">
              <button 
                onClick={handleFundRequest} 
                disabled={isFunding} 
                className="fund-button"
              >
                {isFunding ? 'Funding...' : 'FUND THIS OPPORTUNITY'}
              </button>
              
              {/* NEW DECLINE BUTTON! */}
              <button
                onClick={() => setShowDeclineModal(true)}
                disabled={isFunding}
                className="decline-button"
              >
                Decline
              </button>
            </div>
          )}
          
          {message && (
            <p className="funding-message" style={{ color: message.startsWith('Error') ? 'red' : 'green' }}>
              {message}
            </p>
          )}
        </div>
        
        {/* Right Column (unchanged) */}
        <div className="detail-card">
          <h3>SME Reputation: {details.sme.reputation.score} (Excellent)</h3>
          {/* ... (rest of the card is the same) ... */}
          <p><strong>Avg. Monthly Sales:</strong> {formatNaira(details.sme.reputation.monthlySalesNaira)}</p>
          <p><strong>Customer Rating:</strong> {details.sme.reputation.customerRating} / 5.0</p>
          <p><strong>On-Time Fulfillment:</strong> {details.sme.reputation.fulfillmentRate * 100}%</p>
          <p><strong>SME Bio:</strong> {details.sme.bio}</p>
        </div>
      </div>
    </div>
  );
}

export default OpportunityDetail;