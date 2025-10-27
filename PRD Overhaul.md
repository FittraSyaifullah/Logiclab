## **Product Requirements Document (PRD)**
1. Product Overview
We are building an AI-powered product creation platform that allows non-technical users to build hardware prototypes and generate 3D visualizations without coding.
The product integrates multiple APIs:
adamcad for 3D modeling



Removed Perplexity/SONAR business analysis per current scope


v0 API used only during signup to create an initial project ID


Stripe for payments


Supabase for authentication and data persistence



##**2. Goals**
Lower the barrier to entry for non-technical creators.


Provide end-to-end workflows: ideation → hardware prototype → refinement.


Ensure a seamless authentication, project management, and payment flow.



##**3. Personas**
1. Domain Expert, Zero Technical Skill
Example: Finance professional with deep knowledge of consumer psychology.


Goal: Build an investing app for Gen Z without coding.


Pain Point: Can’t translate expertise into a functional product.


2. Product Designer (Non-Coder)
Skilled in 3D modeling and prototyping.


Goal: Build and test hardware devices with software control.


Pain Point: Can’t code or build software logic.


3. Secondary School Student
Beginner-level, curious, project-oriented.


Goal: Quickly test an idea for school projects.


Pain Point: No coding or engineering background.



##**4. User Flows**
4.1 Authentication
Flow A: Landing Page → Login → Dashboard


Flow B: Landing Page → Sign Up → Create v0 project (via API) → Store response in Supabase under user row → Dashboard


Flow C: Direct Dashboard access without auth → Redirect to Login → On success, return to Dashboard


Flow D: Landing page → Input box interaction → Prompt popup → Sign Up/Login → Dashboard


4.2 Dashboard
Layout:

Header (profile, logout, payment link)

Hoverable Sidebar (navigation: Dashboard, Payments)

Main Panel: Initial Prompt Form + Chat UI + Hardware Viewer

Initial Prompt Form: Hardware project inputs only

Hardware flow:

Model generation, assembly instructions, and firmware/code scaffolds

Panel with sliders for parametric adjustments (e.g., height, hole size)

Chat UI for hardware editing


4.3 Business Analysis: Removed from scope in current iteration


4.4 Payments (Stripe)
Subscription plans for users (limits on project generations, API calls, or premium SONAR reports).


Billing and subscription management handled via Stripe → integrated into dashboard.



##**5. Features**

### 1. Authentication
- User signup/login via Supabase Auth
- Redirect handling for unauthenticated users
- Store session state for dashboard access

### 2. Project Storage
- Save project metadata and API responses
- Associate projects with user rows in Supabase
- Retrieve past projects on login

### 3. Hardware Prototype Flow
- Toggle hardware mode in dashboard
- Claude generates list of components
- Send component list to adamcad API
- Display returned 3D model in viewer
- Parametric controls (sliders: height, hole size, etc.)
- Chat UI (placeholder for now, not persisted)

### 4. Software Prototype Flow
Removed from scope (v0 used only at signup to create a project ID)

### 5. Chat Functionality
- Unified chat UI component
- Hardware: placeholder only (MVP)
- Software: fully integrated with v0 API

### 6. Business Analysis
- Input form:
  - “What is your project?”
  - “What does it do? What problem does it solve?”
- Send request to SONAR API
- Populate report UI
- “Download as PDF” button

### 7. Payment System
- Subscription tiers (free, pro, enterprise)
- Billing and subscription management via Stripe
- Usage limits (API call quotas, premium SONAR reports)

### 8. Dashboard
- Unified workspace after login
- Components:
  - Header (profile, logout, billing link)
  - Hoverable sidebar (Dashboard, Business Analysis, Payments)
  - Main panel (Initial Prompt Form + Chat UI + Viewer/Demo iframe)



##**6. Technical Architecture**
Frontend: Next.js + Tailwind + shadcn/ui


Backend: Supabase (auth + DB)


APIs:


v0 (signup-only project creation)


Stripe (payments)


Storage: Supabase (user rows store projects, links to generated files/urls)



##**7. Success Metrics**
Adoption: % of new users completing at least 1 project flow (hardware or software).


Engagement: Avg. number of projects created per user.


Conversion: Free → Paid upgrade rate (via Stripe).


Performance:


API response time goals apply to hardware flows.


PDF report generation < 5s.


Reliability: < 1% dashboard access errors due to auth/session mismatch.

