Commercial Smart Facility & Sustainability Manager

An airport-focused facility operations prototype that ingests simulated IoT telemetry, detects operational incidents, quantifies water impact, assigns priority, and automatically routes maintenance actions.

What the Prototype Demonstrates

The system models a high-footfall airport environment where restroom and facility telemetry is continuously monitored.

Core workflow:

Telemetry → Detection → Impact → Priority → Dispatch → Maintenance Ticket → Command Center

The prototype covers:

Continuous water-leak detection

Estimated water-loss calculation

Usage-based cleaning threshold detection

Sensor health / offline monitoring

Deterministic incident prioritization

Automatic maintenance team routing

Maintenance ticket creation with duplicate prevention

Airport command-center visualization

Deterministic telemetry simulation for reproducible testing

Technology Stack

Frontend

React

Vite

Tailwind CSS

Recharts

Lucide React

Backend

Node.js

Express.js

Database

Supabase

PostgreSQL

Data Generation

Deterministic synthetic telemetry simulator

Scenario-based test data

No physical IoT hardware is required to run this prototype.

Repository Structure

project/
├── frontend/              # React + Vite dashboard
├── backend/               # Node.js + Express API
├── simulator/             # Deterministic telemetry generation
├── database/              # SQL/schema/setup files, if included
├── .env.example           # Environment variable template
└── README.md              # Project documentation and run instructions

Folder names may vary slightly depending on the final repository structure. The key requirement is that the frontend, backend, simulator, and database setup remain clearly separated.

Prerequisites

Install the following before running the project:

Node.js 18+ recommended

npm

A Supabase project

A modern web browser

Environment Variables

Create the required .env files from the provided .env.example template.

Example backend configuration:

SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_key
PORT=3000

Do not commit real credentials, API keys, or .env files to GitHub.

Database Setup

Create a Supabase project.

Open the Supabase SQL Editor.

Run the SQL/schema files included in the repository.

Confirm that the telemetry, incidents, maintenance tickets, cleaning, sensor, and water-impact data required by the application are available.

Add the Supabase credentials to the backend environment file.

Run the Backend

Open a terminal in the backend directory:

cd backend
npm install
npm start

The API is expected to run on:

http://localhost:3000

Run the Frontend

Open a second terminal:

cd frontend
npm install
npm run dev

Vite will provide a local development URL, normally similar to:

http://localhost:5173

Open the displayed URL in a browser.

Run the Telemetry Simulator

The simulator generates deterministic telemetry for reproducible demonstrations and testing.

The supported scenarios include:

NORMAL

HIGH_USAGE

LEAK

CLEANING_THRESHOLD

SENSOR_OFFLINE

RECOVERY

Run the simulator using the project script provided in the simulator/backend directory. For example:

node simulator.js

If the final repository uses a different simulator entry file, use the corresponding script documented beside that file.

Simulator Limit

The simulator is capped at 500 telemetry records per run so a demonstration run stops automatically.

This is not a database-wide limit. The database can retain more than 500 records.

Demo Scenario

A typical run demonstrates a continuous water leak in an airport restroom zone.

Example incident values:

Location: Terminal 2 — Restroom Zone A
Priority: CRITICAL
Sustained Flow Rate: 12.4 L/min
Leak Duration: 42 min
Estimated Water Loss: 520 L
Recommended Action: Inspect fixture & supply line shutoff valve
Assigned Team: Facilities / Plumbing Maintenance

The system derives the incident from telemetry behaviour rather than relying on the scenario label itself.

Detection Logic

Continuous Water Leak

A leak is detected from sustained elevated water flow combined with operational context such as occupancy/usage conditions and persistence over time.

Water Impact

Estimated wastage is calculated from the observed flow rate and incident duration.

Example:

12.4 L/min × 42 min ≈ 520 L

Cleaning Threshold

Cleaning requirements are based on actual restroom usage/flush activity rather than treating instantaneous occupancy as completed usage.

Sensor Health

Sensor health tracks telemetry/sensor operational status, including offline and recovery states.

Priority

Priority is deterministic and based on operational factors such as:

Incident severity

Persistence/duration

Water impact

Occupancy/traffic context

Sensor health

Possible priority levels:

LOW / MEDIUM / HIGH / CRITICAL

Dispatch

Detected incidents are mapped to the appropriate facility team and recommended action.

Examples:

WATER_LEAK            → Facilities / Plumbing Maintenance
CLEANING_THRESHOLD    → Cleaning
SENSOR_OFFLINE        → Maintenance

Backend API

The backend exposes operational data for the dashboard through endpoints including:

GET /api/dashboard/summary
GET /api/telemetry
GET /api/incidents
GET /api/tickets
GET /api/cleaning
GET /api/sensors
GET /api/water

The frontend uses these APIs to display the current operational state.

Data & Reliability Approach

The core detection, impact calculation, prioritization, and dispatch logic is deterministic.

This makes the prototype:

Reproducible

Explainable

Easy to test

Independent of an LLM for critical operational decisions

AI/LLM functionality is not required for the core incident pipeline.

Security Notes

Keep .env files out of source control.

Never commit Supabase credentials or other secrets.

Use .env.example for required configuration names only.

Avoid storing local mock database files in Git.

Quick Start

# Terminal 1
cd backend
npm install
npm start

# Terminal 2
cd frontend
npm install
npm run dev

# Terminal 3
# Run the telemetry simulator using the repository's simulator entry point
node simulator.js

Then open the frontend URL shown by Vite.

Expected Result

After the system is running and telemetry is ingested, the dashboard should surface operational information such as:

Telemetry
   ↓
Incident Detection
   ↓
Water Impact
   ↓
Priority
   ↓
Team Routing
   ↓
Maintenance Ticket
   ↓
Command Center

The prototype is intended to demonstrate how existing facility telemetry can be converted into actionable maintenance operations and measurable water stewardship.
