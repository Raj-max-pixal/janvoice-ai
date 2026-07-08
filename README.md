# JanVoice AI

JanVoice AI is a modern civic-tech platform that helps citizens raise public concerns, supports officials in triaging them, and makes community progress visible through a polished digital experience.

## What this project does

JanVoice AI combines a citizen-facing complaint workflow with AI-assisted analysis and transparent reporting. The experience is designed for public-service use cases such as municipal issue reporting, constituency feedback, and policy prioritization.

## Core experience

- Citizens can submit complaints, suggestions, and supporting evidence.
- AI analysis helps summarize issues and suggest a likely category, priority, and action.
- MPs, officials, and admins can review requests through role-aware dashboards.
- A public feed and analytics view make progress easier to understand and trust.

## Tech stack

- React + Vite + TypeScript
- Tailwind CSS
- Firebase Authentication and Firestore
- Google Gemini API
- Chart.js and react-chartjs-2
- React Router and Framer Motion

## Run locally

### Prerequisites
- Node.js 18+
- npm
- Firebase project (optional for demo mode)
- Gemini API key (optional for AI flows)

### Install and start
```bash
npm install
npm run dev
```

### Build for production
```bash
npm run build
```

## Environment variables

Create a .env file in the project root:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

If these values are not provided, the app runs in a demo-friendly mode for local previews.

## Project structure

```text
src/
  components/
  contexts/
  hooks/
  pages/
  services/
  types/
```

## Release status

- Current release: RC1
- Version: 1.0.0
- Status: Demo-ready and production-polish pass complete

## Recommended next steps

1. Connect a real Firebase project and Firestore rules.
2. Add production storage and real media handling.
3. Replace demo AI behavior with live backend integrations if needed.
4. Deploy to Vercel, Netlify, or Firebase Hosting.

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is built for the Google Cloud Build with AI: Code for Communities Hackathon.

## Acknowledgments

- Google Cloud Build with AI: Code for Communities Hackathon
- Firebase
- Google Gemini API
- React community
- Tailwind CSS
