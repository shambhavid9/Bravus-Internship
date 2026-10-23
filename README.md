# Bravvus Solutions Website

A responsive company website with a working enquiry form connected to a Node.js/Express backend and MongoDB database.

## Features

- Responsive Home, About, Services and Contact sections
- Navigation and call-to-action buttons
- Responsive layout for desktop and mobile screens
- Client-side contact form validation
- Email format validation
- Express.js REST API for enquiries
- MongoDB database integration using Mongoose
- Success and error feedback for form submission
- Environment variables for database configuration

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Node.js
- Express.js
- MongoDB
- Mongoose
- Git & GitHub

## Setup Instructions

### 1. Install dependencies

Open a terminal inside the `backend` folder and run:

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file inside the `backend` folder:

```env
MONGODB_URI=your_mongodb_connection_string
```

Do not commit the `.env` file to GitHub.

### 3. Start the backend

Inside the `backend` folder, run:

```bash
node server.js
```

The backend will run on:

```text
http://localhost:3001
```

### 4. Run the frontend

Open the frontend `index.html` using VS Code Live Server.

The frontend communicates with the backend enquiry API.

## API Endpoint

### POST `/api/enquiries`

Example request:

```json
{
  "name": "Test User",
  "email": "test@example.com",
  "message": "Test enquiry"
}
```

The enquiry is validated and stored in MongoDB.

## Testing

The following cases were tested:

- Empty form fields
- Invalid email format
- Valid enquiry submission
- Successful database storage
- Success and error feedback
- Desktop and responsive layouts
- Browser console checked for errors

## Security

- MongoDB credentials are stored in environment variables.
- `.env` and `node_modules/` are excluded using `.gitignore`.
- Database credentials are not included in the repository.

## Status

Task 1 implementation completed and tested.