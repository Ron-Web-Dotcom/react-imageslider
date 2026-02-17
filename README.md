# Slick Pic Slider 📸✨

Slick Pic Slider is a production-grade, AI-powered image gallery and slider application built with React, TypeScript, and the Blink SDK. It allows users to generate stunning photography series using AI, upload their own images, and showcase them in a highly interactive, accessible, and stylish slider.

## 🚀 Key Features

- **AI Image Generation**: Craft professional photography series from simple text prompts using integrated AI models.
- **AI Image Analysis**: Get artistic insights and descriptions for any image in your slider with a single click.
- **AI Speech Synthesis**: Listen to AI-generated insights through high-quality text-to-speech.
- **Smart Image Uploads**: Drag and drop your own photography into the cloud with automatic organization.
- **Customizable Transitions**: Switch between smooth 'Slide' and elegant 'Fade' transitions.
- **Interactive Controls**: Auto-play with a visual progress bar, full-screen mode, and accessible dot navigation.
- **Persistence & Sharing**: All sliders are saved to a secure database and can be shared via unique public links.
- **Responsive Design**: Optimized for both desktop creators and mobile viewers.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **Backend Services**: [Blink SDK](https://blink.new)
  - **Auth**: Managed authentication with secure user sessions.
  - **Database**: Persistent storage for slider configurations and metadata.
  - **Storage**: Cloud storage for user-uploaded images.
  - **AI**: Multi-modal AI for image generation, vision analysis, and speech.
- **Notifications**: Sonner for elegant toast feedback.

## 📂 Project Structure

```text
src/
├── components/
│   └── layout/
│       ├── Sidebar.tsx      # Slider management and generation tools
│       └── MainContent.tsx  # Primary viewer and editor area
├── hooks/
│   └── useSliders.ts        # Core business logic for CRUD and AI operations
├── lib/
│   ├── blink.ts             # Blink SDK client initialization
│   ├── constants.ts         # Design tokens and style presets
│   └── utils.ts             # Helper functions
├── ImageSlider.tsx          # The core, reusable slider component
├── App.tsx                  # Main application shell and auth gate
├── image-slider.css         # Component-specific styles for the slider
└── index.css                # Global design system and Tailwind directives
```

## ⚙️ Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Blink CLI](https://blink.new/docs) (recommended for deployment)

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/Ron-Web-Dotcom/react-imageslider.git
   cd react-imageslider
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment Variables:
   Ensure your `.env.local` contains your Blink project credentials:
   ```env
   VITE_BLINK_PROJECT_ID=your-project-id
   VITE_BLINK_PUBLISHABLE_KEY=your-publishable-key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## 📖 Component Documentation

### `ImageSlider`
The flagship component of the app. It handles the rendering, animation, and AI interactions of the image series.

**Props:**
- `images`: Array of `{ url: string, alt: string }`.
- `transitionType`: `'slide'` | `'fade'` (default: `'slide'`).

**Key Functions:**
- `analyzeCurrentImg()`: Uses AI Vision to generate a descriptive caption for the active slide.
- `speakText(text)`: Converts the provided text into speech using AI.
- `showNextImage() / showPrevImage()`: Navigation logic.

### `useSliders` Hook
The central state manager for the application.

**State:**
- `sliders`: List of all sliders owned by the user.
- `activeSliderId`: The current slider being viewed.
- `viewMode`: `'admin'` (with controls) or `'public'` (view only).

**Operations:**
- `handleGenerateSlider(prompt, style)`: Triggers AI image generation and saves to DB.
- `handleUploadImages(files)`: Uploads images to storage and creates a new slider entry.
- `handleUpdateTransition(id, type)`: Updates the transition style in real-time.

## 🔐 Database Schema

The app uses a single table `sliders` with the following structure:
- `id`: Unique identifier (UUID).
- `user_id`: Owner of the slider.
- `name`: Display name of the gallery.
- `images_json`: JSON stringified array of image objects.
- `transition_type`: Preferred transition style ('slide' or 'fade').
- `created_at`: Timestamp.

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
