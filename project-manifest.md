# Project Manifest: Buildables (Overhaul)

## Project Overview
Buildables is an AI-powered product creation platform that allows non-technical users to build hardware prototypes and generate 3D visualizations without coding. The platform integrates Supabase for authentication and data persistence, and uses v0 only during signup to create an initial project ID.

## Architecture
- **Frontend**: Next.js 15.5.3 with TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: Supabase for authentication and data persistence
- **State Management**: Zustand for global state management
- **Authentication**: Custom session management with localStorage persistence
- **API Integration**: v0 API for software generation, Supabase for user management
- **Component Architecture**: Modular, reusable components following DRY principles

## Current Status
- Last updated: January 2025
- Current milestone: Hardware and Software generation APIs with 3D modeling integration
- Current stage: 92% complete

## Components
- **Authentication System**: ✅ Complete - Login/signup flows, session management, protected routes
- **Dashboard Layout**: ✅ Complete - Main dashboard with header, sidebar, and content areas
- **Initial Prompt Form**: ✅ Complete - Integrated form for hardware project creation
- **Navigation & Sidebar**: ✅ Complete - App sidebar, chat sidebar, logo hover sidebar
- **Content Viewer Components**: ✅ Complete - Hardware viewer
- **Modal/Overlay Components**: ✅ Complete - Integration panel, debug panel
- **UI Primitives**: ✅ Complete - All required shadcn/ui components (button, input, textarea, etc.)
- **State Management**: ✅ Complete - User store, creation store with proper TypeScript types
- **API Routes**: ✅ Complete - Authentication, hardware generation, user management
- **Database Schema**: ✅ Complete - User management with display_name triggers
- **Hardware Generation APIs**: ✅ Complete - 3D components, assembly instructions, and firmware/code scaffolds
- **3D Modeling Integration**: ✅ Complete - SCAD to STL conversion, OpenJSCAD integration
- **Job Queue System**: ✅ Complete - Background processing for hardware model generation

## Next Steps
- **Hardware Specification Modal**: Implement hardware spec modal for detailed hardware project configuration
- **Image Optimization**: Convert key `<img>` usages to `next/image` for better performance
- **Business Analysis**: Implement Perplexity/SONAR integration for market analysis
- **Payment Integration**: Add Stripe integration for subscription management
- **Advanced 3D Features**: Add 3D model manipulation, rotation, and export functionality
- **Real-time Updates**: Implement WebSocket connections for live job progress updates
- **Project Persistence**: Add project saving and loading functionality

## Testing Notes
- **Authentication Flow**: Login/signup works correctly, sessions persist across page refreshes
- **Dashboard Access**: Protected routes properly redirect unauthenticated users
- **Form Integration**: Initial prompt form is properly integrated into dashboard layout
- **Hardware Generation**: 3D model generation, assembly instructions, and firmware code generation working
- **Software Generation**: v0 integration and demo app generation functional
- **3D Model Processing**: SCAD to STL conversion working with OpenJSCAD
- **Job Queue**: Background processing for hardware models implemented
- **Known Issues**: 
  - Some Next.js dev tools errors (non-blocking)
  - Missing image files in public/images (user needs to upload actual images)
  - Database schema warnings for missing first_name/last_name columns (handled gracefully)

## Configuration
- **Environment Setup**: 
  - Supabase URL and Anon Key configured
  - v0 API Key configured
  - OpenAI API Key configured for hardware generation
  - Next.js running on port 3001 (3000 in use)
- **Dependencies**: 
  - Core: Next.js 15.5.3, React 19.1.0, TypeScript, Tailwind CSS
  - UI: shadcn/ui, Radix UI primitives
  - State: Zustand
  - 3D: @react-three/fiber, @react-three/drei, three, @jscad/openjscad
  - PDF: jspdf
  - Database: Supabase client
  - AI: v0-sdk (signup-only)

- **3D Processing**: OpenSCAD WASM worker performs SCAD → STL conversion client-side. Known warning `"Could not initialize localization."` is expected in browser workers; we allow completion when STL output validates, surface the warning to users via UI, and guard for truncated output per transparent error handling principle.

## Recent Achievements
- **Hardware Generation Pipeline**: Complete end-to-end hardware project generation with 3D models, assembly instructions, and firmware/code scaffolds
- **3D Modeling System**: Advanced SCAD processing with parameter support and STL conversion
- **Job Queue System**: Robust background processing for hardware model generation
- **Type Safety**: Comprehensive TypeScript interfaces for all data structures
- **Error Handling**: Transparent errors and user-friendly messages throughout the application

Software generation and Perplexity business analysis flows have been removed per the latest requirements.