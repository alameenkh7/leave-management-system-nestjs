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
# Create database
createdb leave_management

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

The e2e tests cover:
- Complete leave approval workflows
- Employee management operations
- Authentication and authorization
- Business rule validations
- Admin features

## 🔑 Authentication & Sample Users

After running the seed command, you can use these sample credentials:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **Employee** | rohit.singh@company.com | password123 | Can apply for leaves |
| **Manager** | priya.sharma@company.com | password123 | Can approve/reject team leaves |
| **HR Manager** | amit.gupta@company.com | password123 | Final approval authority |
| **Admin** | admin@company.com | password123 | System administration |

## 📡 API Endpoints & Postman Usage

### Base URL
```
http://localhost:3000
```

### 1. Authentication Endpoints

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "rohit.singh@company.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "employee": {
    "id": "uuid",
    "name": "Rohit Singh",
    "email": "rohit.singh@company.com",
    "role": "employee",
    "department": "Engineering"
  }
}
```

### 2. Employee Endpoints

#### Get My Profile
```http
GET /employees/me
Authorization: Bearer <access_token>
```

#### Get My Leave Balance
```http
GET /employees/me/leave-balance
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "casualLeave": {
    "total": 12,
    "used": 3,
    "remaining": 9
  },
  "sickLeave": {
    "total": 10,
    "used": 0,
    "remaining": 10
  },
  "vacationLeave": {
    "total": 18,
    "used": 5,
    "remaining": 13
  }
}
```

### 3. Leave Request Endpoints

#### Apply for Leave
```http
POST /leaves
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "leaveType": "casual",
  "startDate": "2024-12-15",
  "endDate": "2024-12-17",
  "reason": "Family function"
}
```

#### Get My Leave Requests
```http
GET /leaves/my-requests
Authorization: Bearer <access_token>
```

#### Get Leave Request Details
```http
GET /leaves/{leave-request-id}
Authorization: Bearer <access_token>
```

#### Update Leave Request (if pending)
```http
PATCH /leaves/{leave-request-id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reason": "Updated reason",
  "endDate": "2024-12-18"
}
```

#### Cancel Leave Request
```http
DELETE /leaves/{leave-request-id}
Authorization: Bearer <access_token>
```

### 4. Approval Workflow Endpoints

#### Get Pending Approvals (Manager/HR)
```http
GET /leaves/pending-approvals
Authorization: Bearer <manager_or_hr_token>
```

#### Approve Leave Request
```http
POST /leaves/{leave-request-id}/approve
Authorization: Bearer <manager_or_hr_token>
Content-Type: application/json

{
  "comments": "Approved for family function",
  "approverType": "reporting_manager"
}
```

#### Reject Leave Request
```http
POST /leaves/{leave-request-id}/reject
Authorization: Bearer <manager_or_hr_token>
Content-Type: application/json

{
  "comments": "Project deadline conflicts",
  "approverType": "reporting_manager"
}
```

#### Get Approval History
```http
GET /leaves/{leave-request-id}/approval-history
Authorization: Bearer <access_token>
```

### 5. Admin Endpoints

#### Get Leave Summary Statistics
```http
GET /admin/leave-summary
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "totalRequests": 45,
  "pendingRequests": 12,
  "approvedRequests": 28,
  "rejectedRequests": 5,
  "pendingRMRequests": 8,
  "pendingHRRequests": 4
}
```

#### Get Department Statistics
```http
GET /admin/department-stats
Authorization: Bearer <admin_token>
```

**Response:**
```json
[
  {
    "department": "Engineering",
    "totalEmployees": 15,
    "totalLeaveRequests": 32,
    "averageLeavePerEmployee": 2.13,
    "pendingApprovals": 5
  }
]
```

#### Get All Pending Approvals (Admin View)
```http
GET /admin/pending-approvals
Authorization: Bearer <admin_token>
```

### 6. Employee Management (Admin)

#### Create Employee
```http
POST /employees
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "employeeCode": "EMP123",
  "name": "New Employee",
  "email": "new.employee@company.com",
  "password": "password123",
  "department": "Marketing",
  "role": "employee",
  "joinDate": "2024-01-15",
  "reportingManagerId": "manager-uuid",
  "casualLeaveBalance": 12,
  "sickLeaveBalance": 10,
  "vacationLeaveBalance": 18
}
```

#### Get All Employees
```http
GET /employees
Authorization: Bearer <admin_token>
```

#### Update Employee
```http
PATCH /employees/{employee-id}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "department": "Updated Department"
}
```

## 🚀 Postman Collection Setup

### Step 1: Create Environment
1. Open Postman
2. Create a new Environment named "Leave Management"
3. Add these variables:
   - `base_url`: `http://localhost:3000`
   - `access_token`: (will be set automatically)

### Step 2: Authentication Flow
1. **Login Request**: Use the login endpoint to get access token
2. **Set Token**: In the login request's "Tests" tab, add:
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("access_token", response.access_token);
}
```

### Step 3: Authorization Setup
For all protected endpoints, use:
- **Type**: Bearer Token
- **Token**: `{{access_token}}`

### Step 4: Sample Workflow Test
1. **Login** as employee → Get token
2. **Apply for leave** → Get leave request ID
3. **Login** as manager → Get manager token
4. **Approve leave** → Leave moves to HR
5. **Login** as HR → Get HR token
6. **Final approval** → Leave approved
7. **Check leave balance** → Verify deduction

## 🔧 Common Use Cases

### Employee Journey
1. Login → Get profile → Check leave balance
2. Apply for leave → Track status → View history
3. Update/cancel pending requests

### Manager Journey
1. Login → View pending approvals
2. Review leave details → Approve/reject with comments
3. View team leave statistics

### HR Journey
1. Login → View all pending HR approvals
2. Final review and approval/rejection
3. Monitor department-wise leave trends

### Admin Journey
1. Login → View system-wide statistics
2. Manage employee records → Create/update employees
3. Monitor approval workflows → Generate reports

## 📝 Response Status Codes

- `200` - Success (GET requests)
- `201` - Created (POST requests)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

