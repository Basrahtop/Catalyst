// 1. We now import 'useState' and 'useEffect' from React.
// - useState: A "memory box" to store data.
// - useEffect: A tool to run code at a specific time (like when the app first loads).
import React, { useState, useEffect } from 'react';
// 1. Import our new OpportunityDetail component
import OpportunityDetail from './OpportunityDetail';
import './App.css';

// This is the URL of our backend API.
// Make sure your backend server is running at http://localhost:3001!
const API_URL = 'http://localhost:3001/bank/opportunities';

function App() {
  
  // 2. We set up our "State" (our memory).
  // - 'opportunities' is the variable that will hold our array of data.
  // - 'setOpportunities' is the *only* function we use to update that data.
  // - It starts as an empty array: []
  const [opportunities, setOpportunities] = useState([]);
  
  // 3. We set up a "loading" state.
  // This will let us show "Loading..." while we wait for the network.
  const [isLoading, setIsLoading] = useState(true);


// 2. Add new "state" to track *which* opportunity is selected.
  // It starts as 'null', meaning nothing is selected.
  const [selectedOppId, setSelectedOppId] = useState(null);


  // 4. This 'useEffect' hook runs *once* when the App component first loads.
  // The empty array at the end, [], means "only run this one time."
  useEffect(() => {
    
    // 5. We define an "async" function to fetch our data.
    // "async" just means it's a function that can "wait" for a network request.
    async function fetchOpportunities() {
      try {
        // 6. "await fetch(...)": We "wait" for the network call to our API to complete.
        const response = await fetch(API_URL);
        
        // 7. "await response.json()": We "wait" for the response to be converted from JSON.
        const data = await response.json();
        
        // 8. We update our "State" with the data we received.
        setOpportunities(data);
        
      } catch (error) {
        // Handle any errors (like if the backend is not running)
        console.error("Failed to fetch opportunities:", error);
      } finally {
        // 9. No matter what, we are done loading.
        setIsLoading(false);
      }
    }
    
    // 10. We call the function we just defined.
    fetchOpportunities();

  }, [selectedOppId]); 

  // 11. This is a helper function to format the Naira amount
  const formatNaira = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };


  // --- NEW ---
  // 3. This is our main "manager" logic.
  // It decides which "page" to show.
  const renderCurrentView = () => {
    // If an ID is selected...
    if (selectedOppId) {
      // Show the Detail component!
      // We pass it the ID it needs to fetch...
      // ...and we pass it a function to call when "Back" is clicked.
      return (
        <OpportunityDetail 
          opportunityId={selectedOppId} 
          onBack={() => setSelectedOppId(null)} 
        />
      );
    }
    
    // --- This is our original table code from before ---
    
    if (isLoading) {
      return <p>Loading opportunities...</p>;
    }
    
    if (opportunities.length === 0) {
      return <p>No new funding opportunities found.</p>;
    }
    
    return (
      <table className="opportunities-table">
        <thead>
          <tr>
            <th>SME</th>
            <th>Amount</th>
            <th>Rep. Score</th>
            <th>Purpose</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opp) => (
            <tr key={opp.requestId}>
              <td>{opp.smeName}</td>
              <td>{formatNaira(opp.amount)}</td>
              <td>{opp.reputationScore}</td>
              <td>{opp.purpose}</td>
              <td>{opp.status}</td>
              <td>
                {/* --- NEW --- */}
                {/* 4. We add the onClick handler! */}
                {/* When clicked, it sets the selected ID to this row's ID */}
                <button 
                  onClick={() => setSelectedOppId(opp.requestId)} 
                  className="view-button"
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>[Bank Name] Partner Portal</h1>
        {/* --- NEW --- */}
        {/* We make the subtitle dynamic */}
        <h2>
          {selectedOppId ? 'Reviewing Opportunity' : 'New SME Funding Opportunities'}
        </h2>
      </header>

      {/* --- NEW ANALYTICS SECTION ADDED BELOW --- */}
      
      {!selectedOppId && (
        <section className="analytics-summary">
          <div className="stat-box">
            <h3>Total Funded</h3>
            <p>₦12,540,000</p>
          </div>
          <div className="stat-box">
            <h3>Funded Today</h3>
            <p>₦850,000</p>
          </div>
          <div className="stat-box">
            <h3>Repayment Rate</h3>
            <p>98.2%</p>
          </div>
          <div className="stat-box">
            <h3>Est. Profit (YTD)</h3>
            <p>₦1,254,000</p>
          </div>
        </section>
      )};
      
      <main className="App-content">
        {/* 5. We call our one render function */}
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;