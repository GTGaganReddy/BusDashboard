# Driver Route Assignment System

## Overview

This is a full-stack web application for managing driver route assignments. The system allows users to view, create, and manage assignments of drivers to routes on a daily basis. It features a dashboard with weekly navigation, route tables, and summary statistics.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Style**: REST API with JSON responses

### Project Structure
The application follows a monorepo structure with clear separation of concerns:
- `client/` - React frontend application
- `server/` - Express.js backend API
- `shared/` - Shared TypeScript schemas and types
- `components.json` - shadcn/ui configuration

## Key Components

### Database Schema
The system uses three main entities:
- **Drivers**: Store driver information including name, code, monthly hours remaining, and status
- **Routes**: Store route details including route number, description, and required hours
- **Assignments**: Link drivers to routes with specific dates and assignment status

### Frontend Components
- **Dashboard**: Main application view with weekly navigation and route management
- **WeeklyNavigation**: Component for selecting dates within a week
- **RouteTable**: Displays route assignments with filtering and sorting capabilities
- **SummaryCards**: Shows key metrics like total routes, active drivers, and hours

### Backend Services
- **Storage Layer**: Abstract interface with PostgreSQL database implementation for persistent data storage
- **Route Handlers**: RESTful endpoints for managing drivers, routes, and assignments
- **Validation**: Zod schemas for request/response validation
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations

## Data Flow

### Client-Server Communication
1. Frontend makes HTTP requests to `/api/*` endpoints
2. Backend validates requests using Zod schemas
3. Data is processed through the storage layer
4. Responses are returned as JSON with proper error handling

### State Management
1. TanStack Query manages server state with automatic caching
2. Component state handles UI interactions and form data
3. Shared schemas ensure type safety between client and server

### Assignment Management
1. Users can view assignments by date range (weekly view)
2. Assignments can be created, updated, or deleted
3. Bulk assignment operations are supported
4. Real-time statistics are calculated based on current data

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI components for accessibility
- **wouter**: Lightweight client-side routing
- **zod**: Runtime type validation and parsing

### Development Dependencies
- **Vite**: Fast build tool and development server
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Development Environment
- Uses Vite dev server for hot module replacement
- Express server runs with tsx for TypeScript execution
- Database migrations handled via Drizzle Kit

### Production Build
1. Frontend built with Vite to static assets
2. Backend compiled with ESBuild to single bundle
3. Static assets served from Express server
4. Database schema pushed using Drizzle migrations

### Environment Configuration
- `DATABASE_URL` required for PostgreSQL connection
- Development vs production mode controlled via `NODE_ENV`
- Replit-specific configurations for cloud deployment

## User Preferences

Preferred communication style: Simple, everyday language.

## OR-Tools Mathematical Optimization

The system uses Google OR-Tools library for mathematical optimization with guaranteed optimal solutions:

### Mathematical Model
- **Binary Variables**: x[i,j] = 1 if driver i assigned to route j, 0 otherwise
- **Linear Programming**: Uses SCIP solver for optimal assignment calculation
- **Constraint Programming**: Enforces business rules mathematically

### Constraints
1. **Route Coverage**: Each route assigned to exactly one driver
2. **Driver Capacity**: Each driver assigned to at most one route per day  
3. **Hour Limits**: Driver's assigned hours ≤ their remaining monthly hours

### Objective Function
Maximize weighted assignments where weights prioritize drivers with more remaining hours:
- Weight = driver_available_hours / total_available_hours
- Ensures even workload distribution across the month
- Optimal balance between efficiency and fairness

### Three-Step Workflow
1. **Pull Hours**: GET /api/drivers to retrieve current monthly hours
2. **Optimize**: POST /api/ortools/optimize with selected drivers and routes
3. **Apply**: POST /api/ortools/apply to save assignments and update hours

## GPT Assistant Integration

The system provides a simplified LibreChat action configuration that enables:
- Flexible driver and route selection by GPT assistant
- Multiple optimization iterations before applying
- Automatic dashboard updates and hour tracking
- Intelligent recommendations based on results

## Changelog

Changelog:
- July 04, 2025. Initial setup with in-memory storage
- July 04, 2025. Added PostgreSQL database with persistent storage, seeded with sample data
- July 04, 2025. Successfully tested POST requests for assignment data storage and retrieval
- July 04, 2025. Implemented automatic monthly hours tracking system with driver management and real-time calculations
- July 05, 2025. Integrated OR Tools optimization directly into dashboard with Python-based algorithms
- July 05, 2025. Created comprehensive GPT assistant API for LibreChat integration with intelligent workflow management
- July 05, 2025. Implemented complete optimization workflow: analyze → optimize → balance → apply → recommend
- July 05, 2025. Simplified OR Tools workflow to 3-step process: pull hours → optimize → apply assignments
- July 05, 2025. Implemented real Google OR-Tools mathematical optimization with SCIP solver for guaranteed optimal solutions