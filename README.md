# E-Tutors Backend Documentation

## Overview
E-Tutors is a modern two-sided marketplace application that connects students with verified tutors. This backend service is built using TypeScript and Node.js, providing a robust API for user authentication, tutor management, payment processing, and more.

## Features
- User authentication (registration, login, password reset)
- Tutor onboarding and profile management
- Student assignment posting and booking management
- Payment processing through Stripe
- RESTful API for frontend integration

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- TypeScript
- MongoDB (or any other database of your choice)

### Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/E-Tutors.git
   ```
2. Navigate to the backend directory:
   ```
   cd E-Tutors/backend
   ```
3. Install dependencies:
   ```
   npm install
   ```

### Configuration
- Create a `.env` file based on the `.env.example` file provided.
- Set up your database connection string and any other necessary environment variables.

### Running the Application
To start the backend server, run:
```
npm run start
```
For development mode with hot reloading, use:
```
npm run dev
```

### API Documentation
Refer to the API routes defined in `src/routes/api.routes.ts` for available endpoints and their usage.

## Directory Structure
- `src/index.ts`: Entry point of the application.
- `src/app.ts`: Application setup including middleware and routes.
- `src/controllers`: Contains controller files for handling requests.
- `src/services`: Contains service files for business logic.
- `src/models`: Defines data models for the application.
- `src/routes`: Defines API routes.
- `src/middleware`: Contains middleware for authentication and error handling.
- `src/utils`: Utility functions used throughout the application.
- `src/types`: TypeScript types and interfaces.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.