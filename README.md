# **Blockchain-Enabled EV Battery Passport with AI-Driven Intelligence**

---

## 🏗️ Project Overview

This project is a decentralized **Battery Passport System** designed for the circular economy. It provides a verifiable, tamper-resistant record of a battery’s complete lifecycle—from manufacturing through usage, repair, ownership transfer, and recycling.

By combining **Blockchain Technology** for immutable auditability and **AI/ML Models** for predictive health diagnostics, the system enables transparency and trust across the battery supply chain and secondary markets.

---

## 📄 Documentation

For a deep dive into the technical architecture, data flow, and model implementations, please refer to the:
- [**Technical Documentation (DOCUMENTATION.md)**](file:///e:/Block_chain/blockchain-based-digital-passport-for-retired-ev-batteries/DOCUMENTATION.md)

---

## 🛠️ Tech Stack

- **Blockchain**: Solidity, Hardhat, Ethers.js
- **Frontend**: Next.js 14, Tailwind CSS, Lucide React
- **Backend**: Node.js, Express
- **AI/ML**: Python (LSTM, LightGBM, XAI)

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js & npm
- Python 3.9+
- Metamask Extension

### 2. Installation
```powershell
# Install core dependencies
npm install

# Install frontend dependencies
cd battery-frontend
npm install
```

### 3. Local Development
1. **Start Hardhat Node**:
   ```powershell
   npx hardhat node
   ```
2. **Deploy Contract**:
   ```powershell
   npx hardhat run scripts/deploy.js --network localhost
   ```
3. **Start Backend**:
   ```powershell
   cd backend
   npm start
   ```
4. **Start Frontend**:
   ```powershell
   cd battery-frontend
   npm run dev
   ```

---

## 🌐 Testnet Deployment
Ready to move beyond localhost? Follow our:
- [**Testnet Deployment Guide (.agent/workflows/deploy-testnet.md)**](file:///e:/Block_chain/blockchain-based-digital-passport-for-retired-ev-batteries/.agent/workflows/deploy-testnet.md)

---

## 📊 Key Features
- **ERC-721 Asset Identity**: Each battery is a unique digital asset on the blockchain.
- **Role-Based Access**: Specialized views for Manufacturers, Service Providers, and Recyclers.
- **AI Diagnostics**: Real-time State of Health (SoH) and Reliability Credit Scoring.
- **Explainable AI (XAI)**: Transparent reasoning for predictive outcomes.
- **Tamper-Proof Logging**: Complete transaction history with technical block-level details.

---

## 📂 Architecture Map
- `contracts/`: Smart contract logic.
- `backend/`: Blockchain interaction services and data synchronization.
- `battery-frontend/`: Next.js dashboard and lifecycle management.
- `USECASE/`, `credit_score/`, `optimization/`: AI inference engines.

---

**Developed for the Sustainable EV Ecosystem • 2026**
