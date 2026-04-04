# Poll City Product Brief

## Overview
Poll City is a comprehensive campaign operations platform and civic engagement application designed to empower political campaigns and engage citizens. Built as a single codebase with two distinct user experiences, it serves both campaign teams and the general public.

## Products

### Poll City Admin
**Target Users:** Campaign staff, managers, elected-official staff, GOTV teams  
**Access:** Private, campaign-scoped authentication required  
**Purpose:** Full campaign operations management

**Key Features:**
- **Voter CRM:** Contact management with custom fields, interaction logging, support tracking
- **Canvassing:** Walk lists, household management, Not Home tracking, GOTV status
- **Task Management:** Create, assign, and track campaign tasks with priority grouping
- **Import/Export:** CSV data management with preview and validation
- **AI Assist:** Campaign strategy assistance with Anthropic Claude or OpenAI integration
- **Analytics Dashboard:** Support rates, activity feeds, interaction history
- **Settings:** Profile management, campaign configuration, custom field definitions
- **Sign Tracking:** Request and track campaign signs
- **Volunteer Management:** Recruit and coordinate volunteers
- **Donation/Pledge Capture:** Track financial support
- **Polls Management:** Create and manage internal campaign polls

### Poll City Social
**Target Users:** Voters, residents, general public  
**Access:** Public browsing, authenticated actions for voting/following  
**Purpose:** Civic engagement and public participation

**Key Features:**
- **Official Discovery:** Find local representatives by postal code
- **Public Polls:** Participate in live polling on community issues
- **Official Profiles:** View representative information and ask questions
- **Support Signals:** Express support for candidates or issues
- **Profile Management:** User accounts for following and voting

## Technical Architecture
- **Framework:** Next.js 14 with App Router
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth with role-based access (Admin, Manager, Volunteer, Public)
- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide React icons
- **Forms:** React Hook Form with Zod validation
- **Notifications:** Sonner for toast messages
- **Data Processing:** PapaParse for CSV, XLSX for Excel
- **Testing:** Jest with React Testing Library
- **Deployment:** Single Vercel deployment with route-based product isolation

## Database Schema
27 models including User, Campaign, Contact, Household, Task, Poll, Official, VolunteerProfile, Sign, Donation, and more. Supports custom fields via EAV pattern for flexible campaign data.

## Development Status
- **Current Version:** 0.1.0 (MVP Build)
- **Phase 1:** Core operations complete, multi-campaign support
- **Roadmap:** Enhanced canvassing, sign operations, volunteer scheduling, public features, marketplace integration

## Key Differentiators
- Unified platform serving both campaign operations and public engagement
- Campaign-scoped data isolation with shared backend
- AI-powered campaign assistance
- Comprehensive custom field system
- PWA-ready social app for offline access
- Strong focus on civic participation and transparency