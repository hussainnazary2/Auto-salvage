# Damaged Car Buying Business Website

A React application for a damaged car buying business in New Zealand with the following features:

1. Public Homepage with:
   - Hero section with headline and subheadline
   - Car submission form
   - How It Works section
   - Why Choose Us section
   - About Us section

2. Admin Login Page:
   - Simple login form (accepts any credentials for demo)
   - Redirects to dashboard upon login

3. Admin Dashboard:
   - Table of dummy leads
   - Charts showing traffic sources and leads per week
   - Logout functionality

4. AI Chatbot:
   - Floating chat button accessible from all pages
   - Powered by Ollama for local AI assistance
   - Helps users with car selling questions

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- Ollama (for chatbot functionality)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd damaged-car-business
   ```

3. Install dependencies:
   ```
   npm install
   ```

### Setting up Ollama for Chatbot

1. Download and install Ollama from [https://ollama.com/](https://ollama.com/)
2. Pull a model (e.g., llama3):
   ```
   ollama pull llama3
   ```
3. Start Ollama service (it should start automatically after installation)

### Running Locally

To start the development server:
```
npm start
```

The application will be available at http://localhost:3000

To start Ollama (if not already running):
```
ollama serve
```

### Building for Production

To create a production build:
```
npm run build
```

### Deployment

This application is ready to deploy to Vercel:

1. Push your code to a GitHub repository
2. Sign up/log in to Vercel
3. Click "New Project"
4. Import your GitHub repository
5. Configure the project:
   - Framework Preset: React
   - Build Command: `npm run build`
   - Output Directory: `build`
6. Click "Deploy"

## Technologies Used

- React
- React Router
- Recharts (for data visualization)
- CSS3 (for styling)

## Project Structure

```
src/
├── assets/          # Image assets
├── components/      # Reusable components
├── pages/           # Page components
└── App.js          # Main app component with routing
```

## Features

- Responsive design that works on mobile, tablet, and desktop
- Professional color scheme (blue for trust, orange for call-to-action)
- Form validation
- Local storage for session management
- Interactive charts in the admin dashboard
- AI-powered chatbot using Ollama

## Chatbot Usage

The chatbot can be accessed by clicking the chat icon (💬) in the bottom right corner of any page. It connects to your locally running Ollama service to provide AI assistance.

For the chatbot to work:
1. Make sure Ollama is installed and running
2. Ensure a model is available (default is llama3)
3. The web browser must be able to make requests to http://localhost:11434