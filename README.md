# HChat

A full-stack real-time chat application built with React, Node.js, PostgreSQL, and Socket.IO.

## Features

- User authentication with JWT tokens
- Secure password hashing with bcrypt
- Real-time messaging with Socket.IO
- Persistent message history in PostgreSQL
- Protected routes for authenticated users
- Online status indicators

## Tech Stack

**Frontend:** React.js, React Router, Socket.IO Client, CSS Modules

**Backend:** Node.js, Express.js, Socket.IO, JWT, Bcrypt

**Database:** PostgreSQL

## Prerequisites

- Node.js
- PostgreSQL

## Installation

1. Clone the repository
git clone https://github.com/hamzaallaberdiyew-boop/HChat.git

2. Install server dependencies
cd server
npm install

3. Install client dependencies
cd client
npm install

4. Create a `.env` file in the server folder with the following variables
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hchat
DB_USER=postgres
DB_PASSWORD=yourpassword
JWT_SECRET=yoursecretkey

5. Start the server
cd server
npm run dev

6. Start the client
cd client
npm start

## Author

Hamza Allaberdiyev