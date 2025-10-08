# 🏢 Office Leave Management System

A comprehensive Leave Management System built with NestJS, featuring dual approval workflow (Reporting Manager → HR Manager) commonly used in Indian IT companies.


## 🚀 Features

### Core Functionality
- **Employee Leave Management**: Apply, update, cancel leave requests
- **Dual Approval Workflow**: Sequential approval by Reporting Manager and HR Manager
- **Leave Balance Tracking**: Annual quotas for Casual (12), Sick (10), Vacation (18) days
- **Audit Trail**: Complete approval/rejection history
- **Admin Dashboard**: Department-wise statistics and reporting

### Technical Features
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Employee, Reporting Manager, HR Manager, Admin roles
- **TypeScript**: Full type safety throughout the application
- **PostgreSQL**: Robust relational database with TypeORM
- **Comprehensive Testing**: Unit tests with Jest framework

## 🛠️ Technology Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with Passport
- **Testing**: Jest
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI ready

## 📋 Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL (v12+)
- npm or yarn

## 🚦 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd leave-management-system

# Install dependencies
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=leave_management

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# Application
PORT=3000
NODE_ENV=development
```

### 3. Database Setup

```bash

# Run migrations
npm run migration:run

# Seed sample data
npm run seed
```

### 4. Start the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The application will be available at `http://localhost:3000`

## 🧪 Testing

### Unit Tests
```bash
# Run unit tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm run test:watch
```

### Integration Tests (E2E)
```bash
# Run end-to-end tests
npm run test:e2e

# Run specific e2e test file
npm run test:e2e -- leave-workflow.e2e-spec.ts
```