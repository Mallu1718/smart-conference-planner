# Smart Conference Session Planner

**Team:** APEX  
**Problem Statement:** 60 — Smart Conference Session Planner  
**Team ID:** CBC093  
**College:** Global Academy of Technology

## About the Project

Smart Conference Session Planner is a web application that helps conference participants explore sessions, register for events, monitor seat availability, and avoid scheduling conflicts.

## Features

- Participant sign-up, login, and logout
- Browse conference sessions and speakers
- Search sessions and filter by category
- View conference rooms and session capacity
- Register for sessions and cancel registrations
- Prevent duplicate registrations
- Detect overlapping session registrations
- Display registered and available seat counts
- Store session and registration data in Supabase

## Technology Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend and database services:** Supabase
- **Authentication:** Supabase Auth
- **Hosting:** Vercel
- **Version control:** Git and GitHub

## Live Demo

[Open the deployed application](https://smart-conference-planner.vercel.app/)

## Getting Started

1. Install Node.js.
2. Clone this repository.
3. Install dependencies using `npm install`.
4. Create a `.env.local` file in the project root.
5. Configure the required Supabase environment variables.
6. Start the development server using `npm run dev`.

## Environment Variables

Configure these variables locally. Never commit your actual keys.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Team

**APEX — Global Academy of Technology**

Developed as a hackathon project to make conference scheduling more efficient and conflict-free.