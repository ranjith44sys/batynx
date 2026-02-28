# 🔋 Blockchain-Based Digital Passport for Retired EV Batteries

A comprehensive, decentralized ecosystem for tracking, verifying, and repurposing electric vehicle batteries. This project combines **Blockchain Technology** for immutable lifecycle auditability with a **LangGraph-powered AI Multi-Agent System** for advanced diagnostics and marketplace orchestration.

---

## 🌟 Key Features

### 📋 Digital Battery Passport (ERC-721)
- **Immutable Traceability**: Every battery is minted as a unique NFT, recording its journey from manufacturing to recycling.
- **Lifecycle Events**: Verifiable logs for Manufacturing, Usage, Maintenance, ownership Transfers, and Recycling.
- **Role-Based Access**: Specialized interfaces for Manufacturers, Owners, Service Providers, and Recyclers.

### 🤖 AI-Driven Intelligence (LangGraph Ecosystem)
- **Multi-Agent Orchestrator**: A coordinated pipeline of specialized agents:
    - **Battery Health Agent**: Predicts SoH (State of Health) and RUL (Remaining Useful Life).
    - **Risk & Fraud Agent**: Identifies safety hazards and suspicious data patterns.
    - **Sustainability Agent**: Calculates carbon footprint and environmental impact offset.
    - **Market Intelligence Agent**: Provides real-time fair-value pricing for the second-life market.
    - **Recommendation Agent**: Intelligently matches batteries to user use cases (solar, DIY EV, etc.).
- **Autonomous Transactions**: AI agents can facilitate battery purchases directly through the marketplace API.

### 🛒 Second-Life Marketplace
- **Verified Listings**: Only batteries with a verified blockchain history can be listed.
- **Secure Buy Flow**: End-to-end purchase process integrated with Supabase metadata and blockchain event logging.
- **Deep-Link Diagnostics**: One-click AI analysis for any listing in the marketplace.

---

## 🛠️ Technology Stack

| Component | Tech Used |
| :--- | :--- |
| **Blockchain** | Solidity, Hardhat, Ethers.js |
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, Lucide React |
| **Backend API** | Node.js, Express, Supabase (PostgreSQL) |
| **AI Backend** | Python, FastAPI, LangChain, LangGraph |
| **Data Sync** | Custom Node.js SyncService for Blockchain-to-Supabase restoration |

---

## 📂 Project Structure

```text
├── contracts/               # Solidity Smart Contracts
├── battery-frontend/        # Next.js Web Application
├── backend/                 # Node.js/Express API Gateway
├── Agent/
│   └── ev_battery_agent/    # Python Multi-Agent AI System
├── scripts/                 # Hardhat Deployment Scripts
└── ignition/                # Hardhat Ignition Modules
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.9+)
- **Hardhat** (`npm install --save-dev hardhat`)
- **Supabase Account** (for database and metadata)

### 2. Environment Setup
Create `.env` files in the root, `backend/`, and `Agent/ev_battery_agent/` based on the provided `.env.example` templates.
Ensure you have your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `CONTRACT_ADDRESS` configured.

### 3. Execution (Local Environment)

**Step A: Start the Blockchain Node**
```powershell
npx hardhat node
```

**Step B: Deploy the Smart Contracts**
```powershell
npx hardhat run scripts/deploy.js --network localhost
```

**Step C: Start the Node.js Backend**
```powershell
cd backend
npm install
npm start
```

**Step D: Start the AI Agent Server**
```powershell
cd Agent/ev_battery_agent
pip install -r app/requirements.txt
python api_server.py
```

**Step E: Launch the Frontend**
```powershell
cd battery-frontend
npm install
npm run dev
```

---

## 🔒 Security & Verification
- **QR Code Integration**: Every battery passport generates a unique QR code for instant field verification.
- **Access Guard**: Sensitive operations (like recycling registration) are protected by role-based authentication.
- **Blockchain Sync**: Automated service ensures that the local database always reflects the ground truth of the Ethereum ledger.

---

## 🌿 Contribution
Developed to accelerate the global transition to sustainable energy through battery circularity. 🚀

**© 2026 EV Battery Passport Project**
