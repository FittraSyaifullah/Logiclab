## **Product Requirements Document (PRD)**
1. Product Overview
We are building an AI-powered product creation platform that allows non-technical users to build hardware or software prototypes, run business analysis, and generate 3D visualizations or working demo apps without coding.
The product integrates multiple APIs:
adamcad for 3D modeling



Perplexity/SONAR for decision-making and business analysis reports


v0 API for software generation


Stripe for payments


Supabase for authentication and data persistence



##**2. Goals**
Lower the barrier to entry for non-technical creators.


Provide end-to-end workflows: ideation → prototype (software or hardware) → analysis → refinement.


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


Hoverable Sidebar (navigation: Dashboard, Business Analysis, Payments)


Main Panel: Initial Prompt Form + Chat UI + Viewer Panel


Initial Prompt Form:


Toggle: Hardware | Software


Hardware flow:


Claude generates list of components → send to adamcad API


Response displayed in 3D viewer


Panel with sliders for parametric adjustments (e.g., height, hole size)


Chat UI placeholder (not yet storing messages)


Software flow:


v0 generates initial app → response includes demoUrl


Display demoUrl in iframe


Chat UI: every user message → request sent to v0 send-message API → response updates iframe + chat log


4.3 Business Analysis (SONAR)
Form:


"What is your project?"


"What does it do? What problem does it solve?"


API call → SONAR generates report


Populate report UI


Provide Download as PDF option


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
- Toggle software mode in dashboard
- Send prompt to v0 API
- Render returned `demoUrl` in iframe
- Chat UI with v0 send-message API
- Each response updates iframe + chat log

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


adamcad (3D hardware models)


v0 (software generation + chat updates)


SONAR (business analysis reports)


Stripe (payments)


Storage: Supabase (user rows store projects, links to generated files/urls)



##**7. Success Metrics**
Adoption: % of new users completing at least 1 project flow (hardware or software).


Engagement: Avg. number of projects created per user.


Conversion: Free → Paid upgrade rate (via Stripe).


Performance:


API response time < 3s for v0 and adamcad.


PDF report generation < 5s.


Reliability: < 1% dashboard access errors due to auth/session mismatch.

