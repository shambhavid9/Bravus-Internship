# Bravvus Solutions - Company Website & Task Management System

## 1. Project Overview

Bravvus Solutions is a web-based company website and task management application developed using HTML, CSS, JavaScript, Node.js, Express.js and MongoDB.

The project consists of two major modules:

- **Task 1 – Company Website:** A responsive company website with an enquiry form connected to a backend API.
- **Task 2 – Task Management System:** A role-based task management application that allows administrators and management users to assign, track and manage tasks, while users can view and update their assigned tasks.

## 2. Features

### Task 1 – Company Website

- Responsive Home, About, Services and Contact sections.
- Navigation and call-to-action buttons.
- Client-side form validation.
- Email format validation.
- Enquiry submission through a REST API.
- MongoDB integration for storing enquiries.
- Success and error feedback.

### Task 2 – Task Management System

- Secure user registration and login.
- Password hashing using bcrypt.
- JWT-based authentication.
- Role-based access control.
- Separate Admin, Management and User portals.
- Task creation, assignment, updating and deletion.
- Task priorities: Low, Medium and High.
- Task statuses: To Do, In Progress, In Review and Done.
- Due dates and overdue task tracking.
- Kanban-style task board.
- Task search and filtering.
- Progress Notes and task activity tracking.
- User management and role management.

### User Roles

| Role | Responsibilities |
|---|---|
| Admin | Manage users, roles and tasks. |
| Management | Create, assign, update and monitor tasks. |
| User | View assigned tasks and update task progress. |

## 3. Technologies Used

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- bcrypt
- JSON Web Token (JWT)

### Testing
- Node.js built-in test runner
- Supertest
- c8 code coverage

### Tools
- Visual Studio Code
- Git and GitHub
- Vercel
- MongoDB Atlas
- Jira

## 4. Project Structure

Bravus-Internship/
|
|-- Task 1 files/
|   |-- backend/
|   |-- index.html
|   |-- admin.html
|   |-- login.html
|   |-- management.html
|   |-- user.html
|   |-- script.js
|   |-- style.css
|
|-- TaskManagement/
|   |-- frontend/
|   |   |-- index.html
|   |   |-- login.html
|   |   |-- admin.html
|   |   |-- management.html
|   |   |-- user.html
|   |
|   |-- backend/
|       |-- models/
|       |-- tests/
|       |-- server.js
|       |-- package.json
|
|-- .gitignore
|-- README.md

## 5. Installation and Setup

### Prerequisites

- Node.js and npm
- MongoDB Atlas account or MongoDB instance
- Git
- Visual Studio Code

### Step 1 – Clone the repository

```bash
git clone https://github.com/shambhavid9/Bravus-Internship.git
cd Bravus-Internship
```

### Step 2 – Install backend dependencies

Open a terminal in `TaskManagement/backend`:

```bash
npm install
```

### Step 3 – Configure environment variables

Create a `.env` file inside `TaskManagement/backend`:

```env
MONGODB_URI=your_production_database_connection_string
JWT_SECRET=your_secure_jwt_secret
ADMIN_NEW_PASSWORD=your_temporary_admin_password
MONGODB_TEST_URI=your_test_database_connection_string
```

**Important:**
- Never commit the `.env` file.
- Use a separate database for automated tests.
- Keep database credentials and JWT secrets private.
- `ADMIN_NEW_PASSWORD` is used only by the local admin password reset utility.

### Step 4 – Start the backend

From `TaskManagement/backend`, run:

```bash
node server.js
```

The local backend runs on:

```text
http://localhost:3001
```

### Step 5 – Run the frontend

Open `TaskManagement/frontend/index.html` using Visual Studio Code Live Server.

The frontend communicates with the deployed or locally configured backend API.

## 6. Automated Testing

The Task Management backend uses Node.js built-in testing and Supertest for API and integration testing.

### Run tests

From `TaskManagement/backend`:

```bash
npm test
```

### Generate code coverage report

```bash
npm run coverage
```

### Latest test results

| Metric | Result |
|---|---:|
| Total tests | 52 |
| Passed | 52 |
| Failed | 0 |
| Statement coverage | 87.05% |
| Branch coverage | 89.79% |
| Function coverage | 66.66% |
| Line coverage | 87.05% |

Tests cover authentication, user management, role-based access, task operations, validation, task assignment and progress comments.

The coverage command generates a local HTML report in the `coverage/` directory.

## 7. Deployment

### Task Management System

- Frontend: https://bravus-internship-frontend.vercel.app
- Backend: https://bravus-internship-backend.vercel.app

### Main Website

The main company website is maintained separately under the `Task 1 files` directory.

## 8. Security

- Passwords are hashed using bcrypt.
- JWT is used for authentication.
- Role-based authorization protects restricted routes.
- MongoDB credentials are stored in environment variables.
- `.env` and `node_modules/` are excluded through `.gitignore`.
- Automated integration tests use a separate test database.

## 9. Known Limitations and Future Improvements

- Increase automated test coverage for remaining error-handling and startup paths.
- Add automated browser-based end-to-end testing.
- Improve notification functionality for task assignments and updates.
- Further enhance frontend responsiveness and accessibility.
- Add more detailed reporting and analytics.

## 10. Project Status

The project includes the company website, role-based task management portals, task tracking, progress comments, backend API testing and deployment.

The automated backend test suite currently passes all 52 tests.

Further manual verification and final handover documentation are part of the final testing and handover process.