# TeamTask

TeamTask is a full-stack collaborative task management application designed for small teams to plan projects, assign work, track progress, communicate around tasks, and collaborate in real time.

The project goes beyond a basic CRUD task manager. It focuses on **authentication, project-level authorization, role-based access control, task ownership, reassignment workflows, subtasks, task discussions, notifications, email communication, analytics, and real-time synchronization with Socket.IO**.

---

## Table of Contents

- [Features](#features)
- [Role-Based Project Access](#role-based-project-access)
- [Task Management](#task-management)
- [Subtasks and Task Collaboration](#subtasks-and-task-collaboration)
- [Task Reassignment](#task-reassignment)
- [Task Visibility](#task-visibility)
- [Task Queries and Resolution](#task-queries-and-resolution)
- [Analytics](#analytics)
- [Authentication and Security](#authentication-and-security)
- [Notifications and Email](#notifications-and-email)
- [Real-Time Collaboration](#real-time-collaboration)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [How the Application Works](#how-the-application-works)
- [Running Locally](#running-locally)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Security Notes](#security-notes)
- [Design Decisions](#design-decisions)
- [Future Improvements](#future-improvements)

---

## Features

### Authentication

- User registration and login
- JWT-based authentication
- Protected API routes
- Password hashing with bcrypt
- Change password
- Forgot-password flow
- Password reset through an emailed reset link
- User profile management

### Project Management

- Create projects
- Project owners and members
- Invite users through email
- Remove members
- Project-level access control
- Role-based permissions
- Project activity feed
- Project statistics
- Search within a project
- Online member presence

### Role-Based Access Control

Projects support different roles:

| Role | Purpose |
|---|---|
| `owner` | Full project control |
| `co-owner` | Elevated project management permissions |
| `product-owner` | Product/task oversight and management |
| `contributor` | Active project contributor |
| `member` | Regular project member |
| `viewer` | Read-oriented project access |

Permissions are enforced on the backend rather than relying only on frontend UI restrictions.

For example, changing another user's task status should not be possible simply because a user can see the task. The backend checks the user's project role and relationship to the task before allowing protected operations.

---

## Task Management

TeamTask provides a Kanban-style task workflow:

```text
To Do  →  In Progress  →  Completed
```

Tasks support:

- Title
- Description
- Status
- Priority
- Due date
- Assignee
- Creator
- Project association
- Comments
- Activity history
- Notifications
- Search/filtering
- Drag-and-drop board interaction

The project dashboard provides:

- Total tasks
- Completed tasks
- In-progress tasks
- Overdue tasks
- Overall project progress

---

## Personal Task View

Members can see all tasks they are allowed to access in a project, while also getting a clear view of **their own assigned work**.

The purpose is to prevent a busy project board from hiding the tasks that specifically require the current user's attention.

A typical project experience therefore contains:

```text
Project tasks
      +
My assigned tasks
      +
Project progress
```

---

## Subtasks and Task Collaboration

A task can contain smaller pieces of work that belong specifically to that task.

Example:

```text
Task:
Fix Dashboard Error Rate

    ├── Subtask: Identify incorrect query
    ├── Subtask: Update dashboard query
    ├── Subtask: Test error-rate calculation
    └── Subtask: Verify with team
```

Subtasks are useful when work is related to a parent task and should not become unrelated top-level project tasks.

A subtask can also involve another team member.

For example:

```text
Parent task
   ↓
Jaspreet is working on the task
   ↓
Needs Bhavesh's support
   ↓
Subtask assigned to Bhavesh
```

This allows collaboration without unnecessarily creating a separate project-level task.

---

## Task Reassignment

Team members may need to hand over work when:

- They leave a task midway
- Their priority changes
- They become unavailable
- Another member is better suited for the work

TeamTask supports a reassignment workflow.

### Request-based reassignment

The current assignee can request that a task be reassigned.

```text
Current Assignee
       ↓
Reassignment Request
       ↓
Owner / Co-owner
       ↓
Approve
       ↓
New Assignee
```

The request can be rejected if reassignment is not appropriate.

### Management reassignment

Authorized project managers can also directly reassign a task when their role permits it.

The reassignment is recorded as part of the project's activity/history so that ownership changes remain visible to the team.

---

## Task Visibility

Not every task needs to be visible to every project member.

TeamTask supports task visibility controls so that a task can be restricted to a specific user or authorized users when required.

This is useful for:

- Sensitive work
- Individual assignments
- Private follow-up tasks
- Internal management work
- Information that should not be exposed to the entire project

Visibility is treated as an **authorization rule**, not merely a frontend filtering feature.

---

## Task Queries and Resolution

A team member can raise a query directly within the context of a task instead of starting a disconnected discussion.

Example:

```text
Task: Fix Dashboard Error Rate

Query:
"Which error-rate calculation should we use?"

      ↓

Team member responds

      ↓

Query resolved
```

This keeps questions, decisions, and their resolution attached to the work they relate to.

It also creates a useful history for understanding why a task was implemented in a particular way.

---

## Comments

Tasks support discussions through comments.

Comments can be used for:

- Clarifications
- Progress updates
- Feedback
- Decisions
- Supporting information

Comments are associated with their task and project context.

---

## Analytics

Owners and co-owners need more than a simple task count.

TeamTask is designed to provide project analytics for both the **team as a whole** and **individual members**.

Useful metrics include:

### Team-level analytics

- Total tasks
- Completed tasks
- In-progress tasks
- To-do tasks
- Overdue tasks
- Completion percentage
- Tasks behind schedule
- Work distribution
- Current project progress

### Individual analytics

For each member, authorized project managers can see metrics such as:

- Assigned tasks
- Completed tasks
- In-progress tasks
- Pending tasks
- Overdue tasks
- Tasks behind schedule
- Completion rate
- Current workload

This helps project owners identify bottlenecks and workload imbalance instead of judging progress only from the Kanban board.

---

## Task Status Permissions

A task's status represents real project progress, so changing it should be permission-controlled.

The backend should distinguish between:

```text
Can view task
        ≠
Can edit task
        ≠
Can change task status
        ≠
Can manage another user's task
```

The assigned user can perform actions allowed by the project's permission model, while authorized project roles such as the owner/co-owner/product-owner can manage work across the project according to their permissions.

This prevents a regular member from arbitrarily moving another person's task from:

```text
To Do → In Progress → Completed
```

just because the task is visible to them.

---

# Notifications and Email

TeamTask supports both:

```text
In-app notification
        +
Email notification
```

Important events can generate notifications such as:

- Task assignment
- Task completion
- Project invitation
- Comments
- Reassignment events
- Task queries
- Other project activity supported by the notification system

Notifications are stored in MongoDB and delivered through Socket.IO for users currently connected.

Email delivery uses Nodemailer with SMTP.

### Brevo SMTP

The current email configuration is designed for Brevo SMTP.

Example:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-brevo-smtp-login
SMTP_PASS=your-brevo-smtp-key
SMTP_FROM=TeamTask <your-verified-sender@example.com>
```

**Never commit SMTP credentials to GitHub.**

If SMTP is not configured during local development, the application can continue using in-app notifications and can log email information to the server console rather than making email configuration a hard dependency.

---

# Real-Time Collaboration

Socket.IO is one of the main features of TeamTask.

The application does not require users to continuously refresh the page to see changes made by teammates.

For example:

```text
Jaspreet
   ↓
Moves task to In Progress
   ↓
REST API
   ↓
Database updated
   ↓
Socket.IO event
   ↓
Project room
   ↓
Shivanshu's browser updates
```

Real-time functionality includes:

- Task creation
- Task updates
- Task deletion
- Drag-and-drop status changes
- Comments
- Notifications
- Online presence
- Project activity
- Project/member updates

### Socket.IO Rooms

TeamTask uses project and user-specific rooms.

| Room | Purpose |
|---|---|
| `user:<userId>` | Personal events such as notifications |
| `project:<projectId>` | Events for users currently viewing a project |

Socket authentication uses the same JWT authentication mechanism used by the REST API.

When a user opens a project, the client joins the corresponding project room. When the user leaves, the client leaves that room.

---

# Architecture

TeamTask is split into a React frontend and Node.js/Express backend.

```text
                    ┌──────────────────────┐
                    │      React Client    │
                    │ React + Vite + Tailwind
                    └──────────┬───────────┘
                               │
                  REST API     │     Socket.IO
                               │
                ┌──────────────▼──────────────┐
                │     Node.js + Express       │
                │                             │
                │  Routes → Controllers       │
                │       → Middleware           │
                │       → Services/Utils       │
                └──────────────┬──────────────┘
                               │
                         Mongoose
                               │
                ┌──────────────▼──────────────┐
                │        MongoDB Atlas         │
                │ Users / Projects / Tasks     │
                │ Comments / Notifications     │
                │ Activity / Reassignment     │
                └──────────────────────────────┘

                         ┌───────────────┐
                         │ Brevo SMTP    │
                         │ Email delivery│
                         └───────────────┘
```

---

# How the Application Works

The core request flow is:

```text
User action
    ↓
React component
    ↓
API service / Axios
    ↓
Express route
    ↓
Authentication middleware
    ↓
Project/task authorization
    ↓
Controller
    ↓
Mongoose
    ↓
MongoDB
    ↓
Notification / Activity
    ↓
Socket.IO event
    ↓
Connected clients
```

The important architectural principle is:

> The REST API is responsible for validating and changing persistent state. Socket.IO broadcasts the successful change to the relevant connected clients.

This keeps the database as the source of truth while still providing a real-time user experience.

---

# Tech Stack

## Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Axios
- Context API
- Socket.IO Client

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt
- Nodemailer
- Socket.IO

## Infrastructure / Services

- MongoDB Atlas
- Brevo SMTP
- GitHub
- Vercel for frontend deployment
- Render for backend deployment

---

# Project Structure

```text
teamtask/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── services/
│   ├── package.json
│   └── ...
│
├── server/
│   ├── config/
│   │   └── Database connection
│   │
│   ├── controllers/
│   │   └── API/business logic
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── projectAccess.js
│   │   └── errorHandler.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   ├── Task.js
│   │   ├── Comment.js
│   │   ├── Notification.js
│   │   └── Activity.js
│   │
│   ├── routes/
│   │   └── Express API routes
│   │
│   ├── socket/
│   │   └── Socket.IO authentication, rooms and presence
│   │
│   ├── utils/
│   │   ├── notifications
│   │   ├── activity
│   │   └── authentication helpers
│   │
│   ├── server.js
│   └── package.json
│
├── .gitignore
└── README.md
```

---

# Data Model

The main entities are:

```text
User
 │
 ├── Projects
 │      │
 │      ├── Members + Roles
 │      ├── Tasks
 │      │    ├── Assignee
 │      │    ├── Subtasks
 │      │    ├── Comments
 │      │    └── Queries
 │      │
 │      ├── Notifications
 │      └── Activity
 │
 └── Personal notifications
```

### Project

A project contains:

- Name
- Description
- Owner
- Members
- Member roles
- Project metadata

### Task

A task contains:

- Project
- Title
- Description
- Status
- Priority
- Due date
- Assignee
- Creator
- Visibility/authorization information
- Parent task when it is a subtask

### Comment

Comments belong to a task and identify their author.

### Notification

Notifications belong to a user and reference the relevant project/task where applicable.

### Activity

Activity records provide a persistent audit-style history of important project actions.

---

# Authentication and Authorization

Authentication and authorization are deliberately separated.

### Authentication

JWT middleware verifies the user's identity:

```text
Authorization: Bearer <JWT>
```

The server verifies the token and loads the associated user.

### Authorization

After authentication, project/task middleware determines whether that user is allowed to perform the requested action.

Conceptually:

```text
Authentication
     ↓
Who are you?

Authorization
     ↓
Are you allowed to do this?
```

This distinction is especially important for project roles, private tasks, reassignment, and task status management.

---

# Running the Project Locally

## 1. Clone the repository

```bash
git clone <your-repository-url>
cd teamtask
```

---

## 2. Start the backend

```bash
cd server
npm install
```

Create:

```text
server/.env
```

Example:

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

CLIENT_URL=http://localhost:5173

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-brevo-smtp-login
SMTP_PASS=your-brevo-smtp-key
SMTP_FROM=TeamTask <your-verified-sender@example.com>
```

Start the server:

```bash
npm run dev
```

Backend:

```text
http://localhost:5000
```

Health check:

```text
GET /api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "TeamTask API"
}
```

---

## 3. Start the frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# Frontend Environment Variables

For Vite, frontend environment variables normally use the `VITE_` prefix.

Example:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Do not put secrets such as JWT signing keys, MongoDB credentials, or SMTP passwords in frontend environment variables.

Anything exposed through a `VITE_` variable can become part of the browser application.

---

# Demo Data

If the backend contains the seed script, sample data can be generated with:

```bash
cd server
npm run seed
```

This is intended for local development/testing.

---

# API Overview

The main currently documented API routes include:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Login |
| GET/PUT | `/api/auth/me` | Get/update profile |
| PUT | `/api/auth/password` | Change password |
| POST | `/api/auth/forgot-password` | Request password reset |
| GET/POST | `/api/projects` | List/create projects |
| GET/PUT/DELETE | `/api/projects/:id` | Manage a project |
| POST | `/api/projects/:id/invite` | Invite a member |
| DELETE | `/api/projects/:id/members/:userId` | Remove a member |
| GET | `/api/projects/:id/stats` | Project statistics |
| GET | `/api/projects/:id/search?q=` | Search within a project |
| GET | `/api/projects/:id/activity` | Project activity |
| GET/POST | `/api/projects/:projectId/tasks` | List/create tasks |
| GET/PUT/DELETE | `/api/tasks/:id` | Manage a task |
| GET/POST | `/api/tasks/:taskId/comments` | List/add comments |
| DELETE | `/api/comments/:id` | Delete a comment |
| GET | `/api/notifications` | Get notifications |
| PUT | `/api/notifications/:id/read` | Mark notification as read |
| PUT | `/api/notifications/read-all` | Mark all notifications as read |

Additional task-management routes may be added as the reassignment, subtask, query, and analytics features continue to evolve.

---

# Testing

Before deployment, verify the major user flows.

## Authentication

- Register
- Login
- Logout
- Change password
- Forgot password
- Receive reset email
- Reset password
- Login with the new password

## Project permissions

Test each role:

```text
Owner
Co-owner
Product-owner
Contributor
Member
Viewer
```

Verify that users cannot perform actions outside their permissions even if they can see the relevant UI.

## Tasks

Test:

- Create task
- Assign task
- Edit task
- Move task
- Complete task
- Delete task
- Reassign task
- Reassignment request
- Subtask creation
- Subtask assignment
- Private task visibility
- Comments
- Queries
- Due dates
- Priorities

## Real-time testing

Open the same project in two browsers.

Example:

```text
Browser A → User 1
Browser B → User 2
```

Perform an action in Browser A and verify Browser B updates without refreshing.

Test:

- Task movement
- Task creation
- Task update
- Comments
- Notifications
- Presence
- Activity

## Email testing

Verify that important events generate email when SMTP is configured:

- Project invitation
- Task assignment
- Password reset
- Other configured notification events

---

# Production Deployment

The intended deployment architecture is:

```text
                 Internet
                    │
          ┌─────────┴─────────┐
          │                   │
       Vercel              Render
      Frontend              Backend
          │                   │
          └─────────┬─────────┘
                    │
              MongoDB Atlas
                    │
                Brevo SMTP
```

### Frontend

Deploy the `client` directory to Vercel.

Typical build:

```bash
npm install
npm run build
```

Output:

```text
dist/
```

Set:

```env
VITE_API_URL=https://<your-backend>.onrender.com/api
VITE_SOCKET_URL=https://<your-backend>.onrender.com
```

### Backend

Deploy the `server` directory as a Node.js web service on Render.

Typical commands:

```bash
npm install
npm start
```

The backend should listen on:

```js
const PORT = process.env.PORT || 5000;
```

Set production environment variables in the hosting provider instead of committing `.env`.

Update:

```env
CLIENT_URL=https://<your-frontend>.vercel.app
```

The exact deployment URLs depend on the deployed projects.

---

# Security Notes

Never commit:

```text
.env
SMTP passwords
SMTP keys
MongoDB credentials
JWT secrets
API keys
```

The repository should contain only safe configuration examples such as:

```text
.env.example
```

Example:

```env
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES_IN=7d
CLIENT_URL=
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Additional production security improvements should include:

- Rate limiting
- Stronger request validation
- Secure HTTP headers
- Appropriate CORS configuration
- Token expiration/rotation strategy
- Production error handling
- Input sanitization where required
- Secure password-reset token handling
- Audit logging for sensitive actions

---

# Design Decisions

## Why Socket.IO?

Polling the server repeatedly would generate unnecessary requests and would not provide the same real-time experience.

Socket.IO allows the server to push changes only when something actually happens.

It also provides useful primitives for:

- Rooms
- Authentication
- Presence
- Event-based communication

---

## Why MongoDB?

The application contains entities such as:

- Users
- Projects
- Members
- Tasks
- Comments
- Notifications
- Activity

MongoDB with Mongoose provides a straightforward document-oriented model while still supporting references between related entities.

---

## Why role-based authorization?

A collaborative project needs more than a simple:

```text
member / not member
```

relationship.

Different users have different responsibilities.

For example:

```text
Owner
  ↓
Project administration

Co-owner
  ↓
Delegated project management

Product-owner
  ↓
Product/task oversight

Contributor
  ↓
Active project work

Member
  ↓
Regular participation

Viewer
  ↓
Read-oriented access
```

The backend is responsible for enforcing these permissions.

---

## Why keep presence in memory?

Online presence is temporary state.

It does not need to survive a server restart, so storing every connect/disconnect event in MongoDB would create unnecessary database writes.

The current Socket.IO server tracks connected sockets in memory and can account for multiple browser tabs belonging to the same user.

For horizontally scaled production deployments, shared presence/state can later be moved to Redis.

---

## Why separate activity from notifications?

They serve different purposes.

### Notifications

Tell a specific user:

> "You were assigned this task."

### Activity

Records what happened in the project:

> "Jaspreet assigned the task to Bhavesh."

Notifications are user-focused. Activity is project-history-focused.

---

# Current Development Direction

TeamTask is being developed as an interview-defensible full-stack project rather than as a collection of unrelated features.

The important concepts demonstrated by the project include:

```text
React
   ↓
REST APIs
   ↓
Express
   ↓
JWT Authentication
   ↓
Authorization / RBAC
   ↓
MongoDB + Mongoose
   ↓
Socket.IO
   ↓
Real-time collaboration
   ↓
Email notifications
```

The project also demonstrates practical workflow concepts such as:

- Ownership
- Delegation
- Reassignment
- Work breakdown through subtasks
- Task-level communication
- Query resolution
- Visibility controls
- Team analytics
- Audit/activity history

---

# Future Improvements

Potential future improvements include:

- Automated unit and integration tests
- End-to-end testing
- Rate limiting
- Better API validation
- Production logging and monitoring
- Redis for distributed Socket.IO state
- Background job processing for email
- CI/CD
- More detailed analytics
- File attachments
- Task labels/tags
- Calendar integration
- Advanced notification preferences
- Pagination for large project activity feeds
- Database indexes for larger datasets
- Horizontal backend scaling

---

# Project Goal

The goal of TeamTask is to understand and demonstrate how a real collaborative full-stack application works end to end.

The project brings together:

- Authentication
- Authorization
- Role-based access control
- Database modeling
- REST APIs
- Frontend state management
- Task/project workflows
- Real-time communication
- Notifications
- Transactional email
- Collaboration
- Analytics

The central technical focus is **real-time team collaboration**: a database change should be validated by the backend and then propagated to the right connected users without requiring a page refresh.

---

## Author

Built as a full-stack learning and portfolio project with a focus on understanding the architecture and implementation of collaborative web applications.
