## Installation

### Backend Setup

```bash
# Navigate to backend project
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys (see SETUP_CHECKLIST.md)

# Apply database migrations
python manage.py migrate

# Start the development server
python manage.py runserver
```

### Frontend Setup

```bash
# Navigate to frontend project
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

### Quick Start (Windows)

Start both servers with the helper script:

```cmd
run-dev.bat
```

---

## Configuration

### Required Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

```env
# Google Gemini API Key (for text operations)
GEMINI_API_KEY=your_gemini_api_key_here

# Google Places API Key (for contractor discovery)
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Google Cloud Project ID (for image generation)
GOOGLE_CLOUD_PROJECT_ID=your_project_id_here

# Google Cloud Location
GOOGLE_CLOUD_LOCATION=us-central1

# Imagen Model
VERTEX_AI_IMAGEN_MODEL=imagen-3.0-generate-001
```

** Detailed setup:** See [`backend/.env.example`](backend/.env.example) for all options

---

## Development URLs

- **Backend API:** `http://127.0.0.1:8000/`
- **Backend Admin:** `http://127.0.0.1:8000/admin/`
- **Frontend App:** `http://127.0.0.1:3000/`
