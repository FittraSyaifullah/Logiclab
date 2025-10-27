# Buildables - AI-Powered Product Creation Platform

Buildables is an AI-powered product creation platform that allows non-technical users to build hardware prototypes and generate 3D visualizations without coding.

## Features

### 🚀 Core Functionality
- **Hardware Prototyping**: Generate 3D components, assembly instructions, and firmware/code scaffolds using AI
- **Unified Dashboard**: Single workspace for hardware project management

### 🎨 Design System
- **Modern UI**: Clean, professional interface with orange-red gradient branding
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Animated Elements**: Subtle animations and hover effects
- **Dark Mode Support**: Built-in dark/light theme switching

### 🔧 Technical Stack
- **Frontend**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **Icons**: Lucide React icons
- **TypeScript**: Full type safety
- **Authentication**: Supabase Auth (ready for integration)

## Project Structure

```
Buildables/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── login/page.tsx        # Login page
│   │   ├── signup/page.tsx       # Signup page
│   │   ├── dashboard/page.tsx    # Main dashboard
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global styles
│   └── lib/
│       └── utils.ts              # Utility functions
├── public/
│   └── images/
│       └── logo.svg              # LogicLab logo
└── components.json               # shadcn/ui configuration
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Buildables
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Core Principles

This project follows strict development principles:

### 🎯 DRY (Don't Repeat Yourself)
- Zero code duplication
- Single implementation per feature
- Reusable components

### 🎯 KISS (Keep It Simple, Stupid)
- Simplest working solution
- No over-engineering
- Maintainable code patterns

### 🎯 Clean File System
- All files used or removed
- Logical organization
- No orphaned files

### 🎯 Transparent Error Handling
- No error hiding
- Clear user feedback
- Actionable error messages

## API Integration

- **Supabase**: Authentication and data persistence
- **OpenSCAD (WASM)**: Client-side SCAD/STL processing for hardware models
- **v0 SDK (signup-only)**: Used only to create an initial project ID on user signup

## Database Schema

The application is designed to work with the provided database schema including:
- User management
- Project storage
- Software prototypes
- Chat messages
- Credit system
- Job processing

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

Ensure these environment variables are set in `.env.local` (for local dev) and your deployment environment:

```
# Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# v0 SDK (signup-only; optional but recommended)
V0_API_KEY=

# Service role key for hardware edge function calls
SUPABASE_SERVICE_ROLE_KEY=
```

Notes:
- `SUPABASE_SERVICE_ROLE_KEY` is sent as `Authorization: Bearer <key>` when invoking hardware-related edge functions so they can read headers and use service role inside the function.
- `V0_API_KEY` is used only during signup to create a v0 project (`src/lib/v0-service.ts`). If it is missing, signup proceeds without a v0 project ID.
- Keep secrets out of version control and configure them in your hosting provider.

### Code Style

- TypeScript for type safety
- Tailwind CSS for styling
- shadcn/ui for components
- Lucide React for icons

## Contributing

1. Follow the core principles
2. Maintain zero duplication
3. Keep implementations simple
4. Ensure transparent error handling
5. Test all functionality

## License

This project is private and proprietary.

---

Built with ❤️ using Next.js, Tailwind CSS, and shadcn/ui