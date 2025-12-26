# Catalyst MVP: Technical Blueprint & Wireframes

**Project:** Catalyst - SME Marketplace & Reputation Engine
**Context:** Hackathon MVP
**Last Updated:** November 2, 2025

---

## 1. Wireframes (The User Experience)

This section outlines the simple, low-fidelity layouts for all screens in our demo.

### SME Mobile App (Folake's View)

**Screen 1: Profile / Marketplace ("My Shop")**

* **Header:** "Catalyst"
* **Profile Section:**
    * [Circular Image] Folake's Picture
    * **Name:** Folake Adebayo
    * **Business:** "Folake's Designs"
    * **Score:** "Reputation: 850" (Tappable component)
* **"Get Funding" Button:** [Button: "Get Fast Funding"]
* **Tab Navigation:** [My Shop] | [Reputation] | [Account]
* **"My Products" (Grid):**
    * A grid of 3-4 items.
    * Each item has:
        * [Image] (e.g., Ankara dress)
        * [Text] "Blue Adire Gown"
        * [Text] "$\₦$45,000"

---

**Screen 2: Reputation Dashboard**

* **Header:** "My Reputation"
* **Main Score (Large):**
    * [Large Circular Graphic] "850 / 1000"
    * [Text Below] "Your score is **Excellent**"
* **"How your score is calculated:"**
    * **Metric 1:**
        * [Icon: Naira]
        * **Monthly Sales (Avg):** $\₦$1,540,000
    * **Metric 2:**
        * [Icon: Star]
        * **Customer Rating:** 4.9 / 5.0 (82 reviews)
    * **Metric 3:**
        * [Icon: Checkbox]
        * **On-Time Fulfillment:** 98%
    * **Metric 4:**
        * [Icon: Profile]
        * **Profile Complete:** 100%

---

**Screen 3: Funding Flow**

* **Header:** "Get Funding"
* **Text:** "Your 850 score pre-qualifies you for instant funding."
* **Form Field 1:**
    * **Label:** "How much do you need?"
    * [Input Box: "$\₦$ 500,000"]
* **Form Field 2:**
    * **Label:** "What is it for?"
    * [Input Box: "New Ankara materials for big order"]
* **"Profit-Share Agreement" (Simplified):**
    * [Checkbox] "I agree to the 10% profit-share on this order."
* **Button:** [Button: "Request $\₦$500,000 Now"]
* **(On Success):**
    * [Large Checkmark Icon]
    * **"Request Approved!"**
    * **Text:** "Your request has been sent to our funding partners. You'll be notified on approval."

---

### Bank Web Dashboard (Lender's View)

**Screen 1: Opportunity Dashboard**

* **Header:** "[Bank Name] Partner Portal" | Logged in: "Mr. Bako"
* **Sub-Header:** "New SME Funding Opportunities"
* **Table / List of Opportunities:**
    * **Row 1 (This is our demo):**
        * **SME:** Folake's Designs
        * **Amount:** $\₦$500,000
        * **Rep. Score:** 850
        * **Purpose:** New Ankara materials
        * **Status:** [Pending]
        * **Button:** [View Details]

---

**Screen 2: Opportunity Details**

* **Header:** "Review: Folake's Designs"
* **Left Column (The Request):**
    * **Amount:** $\₦$500,000
    * **Purpose:** "New Ankara materials for big order"
    * **Term:** "10% Profit-Share"
    * **Buttons:**
        * [Button (Green): "FUND THIS OPPORTUNITY"]
        * [Button (Gray): "Decline"]
* **Right Column (The "Why"):**
    * **Reputation Score: 850 (Excellent)**
    * **Key Metrics:**
        * **Avg. Monthly Sales:** $\₦$1,540,000
        * **Customer Rating:** 4.9 / 5.0
        * **On-Time Fulfillment:** 98%
    * **Business Profile:** "Woman-led Ankara fashion business based in Lagos."

---

## 2. System Architecture (The Technical Blueprint)

This section outlines the technology stack and the API "contract" that connects all components.

### High-Level Diagram

`[SME Mobile App (React Native)]` <--> `[Core API (Node.js)]` <--> `[Bank Web App (React.js)]`

`[Core API (Node.js)]` <--> `[Database (PostgreSQL)]`

---

### Tech Stack

* **SME App:** React Native
* **Bank Dashboard:** React.js
* **API (Backend):** Node.js (with Express.js)
* **Database:** PostgreSQL (or any simple DB like SQLite for the hackathon)

---

### API Endpoints (The "Contract")

This is the central "contract" our frontends and backend will use to communicate. All data is **simulated** by the API for the hackathon.

#### **SME Routes**

* `GET /sme/profile/1`
    * **Purpose:** Gets Folake's profile for Screen 1.
    * **Response (JSON):**
        ```json
        {
          "id": 1,
          "name": "Folake Adebayo",
          "businessName": "Folake's Designs",
          "reputationScore": 850,
          "products": [
            { "id": "p1", "name": "Blue Adire Gown", "price": 45000, "imageUrl": "..." },
            { "id": "p2", "name": "Red Aso-Oke", "price": 75000, "imageUrl": "..." }
          ]
        }
        ```

* `GET /sme/reputation/1`
    * **Purpose:** Gets Folake's data for the Reputation Dashboard (Screen 2).
    * **Response (JSON):**
        ```json
        {
          "id": 1,
          "score": 850,
          "scoreTier": "Excellent",
          "metrics": {
            "monthlySalesNaira": 1540000,
            "customerRating": 4.9,
            "fulfillmentRate": 0.98,
            "profileComplete": 1.0
          }
        }
        ```

#### **Funding Routes**

* `POST /funding/request`
    * **Purpose:** Folake submits the funding form (Screen 3).
    * **Request Body (JSON):**
        ```json
        {
          "smeId": 1,
          "amount": 500000,
          "purpose": "New Ankara materials for big order"
        }
        ```
    * **Response (JSON):**
        ```json
        { "status": "pending", "requestId": "r123" }
        ```

#### **Bank Routes**

* `GET /bank/opportunities`
    * **Purpose:** Loads the Bank Dashboard (Screen 1).
    * **Response (JSON):**
        ```json
        [
          {
            "requestId": "r123",
            "smeName": "Folake's Designs",
            "amount": 500000,
            "reputationScore": 850,
            "purpose": "New Ankara materials...",
            "status": "pending"
          }
        ]
        ```

* `GET /bank/opportunities/r123`
    * **Purpose:** Loads the Bank Detail view (Screen 2).
    * **Response (JSON):**
        ```json
        {
          "request": {
            "requestId": "r123",
            "amount": 500000,
            "purpose": "New Ankara materials for big order",
            "term": "10% Profit-Share"
          },
          "sme": {
            "id": 1,
            "businessName": "Folake's Designs",
            "bio": "Woman-led Ankara fashion business based in Lagos.",
            "reputation": {
              "score": 850,
              "monthlySalesNaira": 1540000,
              "customerRating": 4.9,
              "fulfillmentRate": 0.98
            }
          }
        }
        ```

* `POST /bank/opportunities/r123/fund`
    * **Purpose:** The bank clicks the "FUND" button.
    * **Response (JSON):**
        ```json
        { "status": "approved", "message": "Funding successful." }
        ```