
<div align="center">

 <img width="180" height="180" alt="image" src="https://github.com/user-attachments/assets/386b6514-8120-46c7-8231-d00faff3e20f" />


# 🏛️ JanVoice AI

### AI-Powered Smart Citizen Grievance Management Platform

<p align="center">
Empowering citizens to report public issues, enabling authorities to resolve them faster, and using Artificial Intelligence to improve transparency, accountability, and civic engagement.
</p>

<p align="center">

<a href="https://janvoice-ai-gxcz.vercel.app">
<img src="https://img.shields.io/badge/🌐_Live_Demo-Visit_Now-blue?style=for-the-badge"/>
</a>

<a href="https://github.com/Raj-max-pixal/janvoice-ai">
<img src="https://img.shields.io/github/stars/Raj-max-pixal/janvoice-ai?style=for-the-badge"/>
</a>

<img src="https://img.shields.io/github/forks/Raj-max-pixal/janvoice-ai?style=for-the-badge"/>

<img src="https://img.shields.io/github/license/Raj-max-pixal/janvoice-ai?style=for-the-badge"/>

</p>

<p align="center">

<img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white"/>

<img src="https://img.shields.io/badge/Vite-Latest-646CFF?style=flat-square&logo=vite&logoColor=white"/>

<img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white"/>

<img src="https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black"/>

<img src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white"/>

<img src="https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=flat-square&logo=google&logoColor=white"/>

<img src="https://img.shields.io/badge/TailwindCSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white"/>

</p>

---

### 🚀 Building Smarter Communities Through AI

JanVoice AI is an intelligent civic-tech platform that bridges the gap between **citizens** and **government authorities** through AI-powered complaint management, analytics, and transparent public engagement.

</div>

---

## ✨ Features

- 🤖 AI-powered complaint analysis
- 📍 Smart issue categorization
- 📊 Real-time analytics dashboard
- 👥 Citizen, MP & Admin portals
- 🔔 Complaint tracking & status updates
- 📷 Image upload support
- 📈 Interactive charts & insights
- 🌐 Modern responsive interface

---

# 📸 Preview

<p align="center">
  
<img width="1908" height="848" alt="image" src="https://github.com/user-attachments/assets/f11226b7-825b-4e39-afa4-0f988550df9f" />
</p>

<p align="center">
<i>Modern landing page with AI-powered citizen grievance management.</i>
</p>

---

# ✨ Key Features

<table>
<tr>

<td width="50%">

### 🤖 AI Complaint Analysis

- AI-powered complaint summarization
- Automatic issue categorization
- Priority prediction
- Smart recommendations

</td>

<td width="50%">

### 👨‍💼 Role-Based Dashboards

- Citizen Dashboard
- MP Dashboard
- Admin Dashboard
- Secure Authentication

</td>

</tr>

<tr>

<td>

### 📊 Analytics

- Complaint statistics
- Category distribution
- Resolution trends
- Interactive charts

</td>

<td>

### 🌍 Public Transparency

- Public complaint feed
- Complaint tracking
- Status timeline
- Community engagement

</td>

</tr>
</table>

---

# 🖼️ Screenshots

| Landing Page |
|--------------|
| <img width="1275" height="847" alt="image" src="https://github.com/user-attachments/assets/319e2db0-2573-49d3-b564-51dfa7cf3452" />

| Dashboard |
|--------------|
| <img width="1289" height="841" alt="image" src="https://github.com/user-attachments/assets/424e25d8-ed77-4b43-9f07-e07f657377ac" />


---

# 🏗️ System Architecture

```text
                   Citizens
                       │
                       ▼
          Complaint Submission Portal
                       │
                       ▼
          React + Vite Frontend
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
 Firebase Auth     Firestore      Gemini AI
        │              │              │
        └──────────────┼──────────────┘
                       │
                       ▼
             AI Complaint Analysis
                       │
                       ▼
          Admin / MP / Citizen Portal
                       │
                       ▼
            Analytics & Public Feed
```

---

# 🎯 Main Modules

| Module | Description |
|---------|-------------|
| 🏠 Landing Page | Public introduction and awareness |
| 🔐 Authentication | Secure Login & Registration |
| 📝 Complaint System | Register and manage complaints |
| 🤖 AI Assistant | AI-powered recommendations |
| 📊 Analytics | Complaint insights & charts |
| 👨‍💼 Admin Panel | Complaint management |
| 🏛 MP Dashboard | Constituency monitoring |
| 👤 Citizen Dashboard | Personal complaint tracking |

---

# 💡 Why JanVoice AI?

✅ AI-powered issue analysis

✅ Transparent governance

✅ Faster complaint resolution

✅ Better communication between citizens and officials

✅ Modern responsive UI

✅ Secure authentication

✅ Scalable architecture

---
# 🚀 Getting Started

## Prerequisites

Before running JanVoice AI, make sure you have:

- Node.js **18+**
- npm or yarn
- Firebase Project (Optional)
- Google Gemini API Key (Optional)

---

## 📥 Installation

Clone the repository

```bash
git clone https://github.com/Raj-max-pixal/janvoice-ai.git
```

Move into the project

```bash
cd janvoice-ai
```

Install dependencies

```bash
npm install
```

Start the development server

```bash
npm run dev
```

Open your browser

```
http://localhost:5173
```

---

# ⚙️ Environment Variables

Create a `.env` file in the root directory.

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

VITE_GEMINI_API_KEY=
```

---

# 📂 Project Structure

```text
JanVoice-AI
│
├── public/
│
├── src/
│   ├── assets/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── App.tsx
│
├── screenshots/
│
├── package.json
├── vite.config.ts
└── README.md
```

---

# 🛠️ Tech Stack

| Category | Technologies |
|----------|--------------|
| Frontend | React 19, Vite, TypeScript |
| Styling | Tailwind CSS |
| Backend | Firebase |
| Database | Firestore, MongoDB |
| Authentication | Firebase Auth |
| AI | Google Gemini API |
| Charts | Chart.js |
| Routing | React Router |
| Animation | Framer Motion |
| Deployment | Vercel |

---

# 🌍 Deployment

Build the project

```bash
npm run build
```

Preview production build

```bash
npm run preview
```

Deploy easily using

- Vercel
- Firebase Hosting
- Netlify

---

# 🗺️ Roadmap

- ✅ Citizen Dashboard
- ✅ Admin Dashboard
- ✅ MP Dashboard
- ✅ AI Complaint Analysis
- ✅ Analytics
- ✅ Complaint Tracking
- ✅ Authentication
- 🔄 Real-time Notifications
- 🔄 Mobile App
- 🔄 Multi-language Support
- 🔄 AI Chat Assistant
- 🔄 Government API Integration

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new feature branch

```bash
git checkout -b feature/your-feature
```

3. Commit your changes

```bash
git commit -m "Add amazing feature"
```

4. Push your branch

```bash
git push origin feature/your-feature
```

5. Open a Pull Request 🚀

---

# 👨‍💻 Author

### Raj

Founder of **MultiMax**

Passionate about

- Artificial Intelligence
- Full Stack Development
- Civic Technology
- Open Source
- Cyber Security

GitHub

```
https://github.com/Raj-max-pixal
```

---

# 📜 License

This project was developed as part of

**Google Cloud Build with AI – Code for Communities Hackathon**

Feel free to use this project for learning and educational purposes.

---

# ⭐ Support the Project

If you found this project helpful,

🌟 Star this repository

🍴 Fork it

🐛 Report Issues

💡 Suggest new Features

Every contribution helps improve JanVoice AI.

---

<div align="center">

## ❤️ Building Better Communities Through AI

**JanVoice AI**

Empowering Citizens • Assisting Governments • Creating Transparency

Made with ❤️ by Raj

</div>
