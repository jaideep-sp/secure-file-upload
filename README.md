# Secure File Upload & Metadata Processing Microservice (Node.js)

This project is a Node.js backend microservice built with NestJS that handles authenticated file uploads, stores associated metadata in a PostgreSQL database, and processes uploaded files asynchronously using BullMQ with Redis.

## Core Features

*   **Authentication:** JWT-based authentication (`/auth/login`).
*   **File Upload:** Secure API endpoint (`/files/upload`) for uploading files (e.g., images, documents) with optional metadata (title, description).
*   **Asynchronous Processing:** Uploaded files are added to a queue (BullMQ) for background processing (e.g., checksum calculation, simulated processing).
*   **Status Tracking:** API endpoints to check the status and retrieve metadata of uploaded files (`/files/:id`, `/files`).
*   **User Isolation:** Users can only access and manage files they uploaded.
*   **Database:** PostgreSQL for storing user and file metadata, managed with Prisma ORM.
*   **Background Jobs:** BullMQ powered by Redis for robust job queueing.
*   **API Documentation:** Swagger/OpenAPI available at `/api-docs` in development.

## Tech Stack

*   **Node.js** (v18+)
*   **NestJS Framework**
*   **PostgreSQL** (Database)
*   **Prisma** (ORM)
*   **Redis** (for BullMQ)
*   **BullMQ** (Job Queue System)
*   **JWT** (Authentication)
*   **bcrypt** (Password Hashing)
*   **Multer** (File Handling)
*   **Docker & Docker Compose** (for containerized development and deployment)

## Prerequisites

*   Node.js (>=18)
*   npm or yarn
*   Docker & Docker Compose (Recommended for running database and Redis)
*   A running PostgreSQL instance (if not using Docker Compose for the DB)
*   A running Redis instance (if not using Docker Compose for Redis)

## Setup and Running

### 1. Clone the Repository

git clone  https://github.com/jaideep-sp/secure-file-upload.git

cd secure-file-upload-service


2. Environment Variables
Copy the example environment file and customize it:
cp .env.example .env

Edit the .env file with your specific configurations, especially:
DATABASE_URL: Your PostgreSQL connection string.
For local dev (Postgres running on host): postgresql://USER:PASSWORD@localhost:5432/DB_NAME?schema=public
For Docker Compose (app connecting to 'db' service): postgresql://DB_USER:DB_PASSWORD@db:5432/DB_NAME?schema=public
JWT_SECRET: A strong, unique secret key.
REDIS_HOST & REDIS_PORT:
For local Redis: 127.0.0.1 & 6379
For Docker Compose Redis service: redis & 6379 (these are set in docker-compose.yml for the app service)
If using the db service in docker-compose.yml, set DB_USER, DB_PASSWORD, DB_NAME in .env as they are used by both the app and the Postgres container.

3. Install Dependencies
npm install
or
yarn install

3. Setup Database (Prisma)
Ensure your prisma/schema.prisma reflects the PostgreSQL setup.
Generate Prisma Client:
npx prisma generate

Run migrations to create the database schema in your PostgreSQL database:

npx prisma migrate dev --name initial-setup

Seed initial users (optional but recommended for testing login):

npx prisma db seed

(Default seeded users: user1@example.com / password123, user2@example.com / password123)

5. Running the Application
Option A: Locally (Ensure PostgreSQL and Redis are running separately)

npm run start:dev

The application will typically be available at http://localhost:3000.
Option B: Using Docker Compose (Recommended for consistent environment)
This will start the NestJS application, a PostgreSQL database, and a Redis instance.
Make sure your .env file is configured for the Docker environment 
(e.g., REDIS_HOST=redis, correct DATABASE_URL for the db service, DB_USER, DB_PASSWORD, DB_NAME).

docker-compose up --build

The application will be available at http://localhost:3000 (or the PORT specified in .env).
Migrations and seeding are typically handled by the command in the app service within docker-compose.yml on startup.

6. Accessing API Documentation
Once the application is running (in a non-production environment), Swagger UI documentation is available at:
http://localhost:3000/api-docs

## API Flow Example
 *  POST /auth/login: Authenticate with seeded user credentials (e.g., user1@example.com, password123) to get a JWT access token.
 *  POST /files/upload: Upload a file (multipart/form-data) using the JWT in the Authorization: Bearer <token> header. Include optional title and description.
(Background): A BullMQ job picks up the uploaded file for processing.
 *  GET /files/:id: Check the status and metadata of the uploaded file using its ID and the JWT.
 *  GET /files: List all files uploaded by the authenticated user.
Directory for Uploads
Uploaded files are stored in the ./uploads directory by default (configurable via UPLOAD_DEST in .env). Ensure this directory is writable by the application. If using Docker, this directory is volume-mounted.

##  Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

##  License
MIT
