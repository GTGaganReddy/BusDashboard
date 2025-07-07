# Driver Route Assignment System - Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [OR-Tools Integration](#or-tools-integration)
7. [GPT Assistant API](#gpt-assistant-api)
8. [Data Flow](#data-flow)
9. [Storage Layer](#storage-layer)
10. [Deployment](#deployment)
11. [Configuration](#configuration)
12. [Troubleshooting](#troubleshooting)

## System Overview

The Driver Route Assignment System is a full-stack web application designed to optimize driver route assignments using mathematical optimization algorithms. The system provides:

- **Real-time dashboard** for managing driver assignments
- **Mathematical optimization** using Google OR-Tools
- **Monthly hours tracking** with automatic calculations
- **GPT assistant integration** via LibreChat actions
- **RESTful API** for external integrations
- **Responsive web interface** with modern UI components

### Key Features
- Weekly route assignment management
- Automatic driver hours calculation and tracking
- Mathematical optimization for optimal route assignments
- Real-time data synchronization
- External API integration for GPT assistants
- Comprehensive assignment history and reporting

## Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL (with in-memory fallback)
- **ORM**: Drizzle ORM with Zod validation
- **Optimization**: Python + Google OR-Tools
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Build Tool**: Vite + ESBuild

### Project Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── lib/            # Utility functions
│   │   └── hooks/          # Custom React hooks
├── server/                 # Backend Express application
│   ├── routes.ts           # API route handlers
│   ├── storage.ts          # Storage interface
│   ├── memory-storage.ts   # In-memory storage implementation
│   ├── db.ts              # Database connection
│   ├── ortools-integration.ts  # OR-Tools interface
│   ├── ortools-service.py      # Python optimization service
│   └── gpt-assistant-api.ts    # GPT assistant endpoints
├── shared/                 # Shared TypeScript schemas
│   └── schema.ts          # Database models and validation
└── components.json         # shadcn/ui configuration
```

### System Components

#### 1. Frontend Architecture
- **React Components**: Modular, reusable UI components
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with custom design system
- **Type Safety**: Full TypeScript integration

#### 2. Backend Architecture
- **Express Server**: RESTful API with middleware
- **Storage Layer**: Abstract interface with multiple implementations
- **Validation**: Zod schemas for request/response validation
- **Error Handling**: Comprehensive error management
- **CORS**: Cross-origin resource sharing enabled

#### 3. Database Layer
- **Primary**: PostgreSQL with Drizzle ORM
- **Fallback**: In-memory storage for development
- **Migrations**: Schema versioning with Drizzle Kit
- **Transactions**: ACID compliance for data integrity

## Database Schema

### Core Entities

#### Drivers Table
```sql
CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  monthly_hours_total DECIMAL(10,2) DEFAULT 160.00,
  monthly_hours_remaining DECIMAL(10,2) DEFAULT 160.00,
  status VARCHAR(20) DEFAULT 'active'
);
```

#### Routes Table
```sql
CREATE TABLE routes (
  id SERIAL PRIMARY KEY,
  route_number VARCHAR(50) NOT NULL,
  description TEXT,
  hours_required DECIMAL(10,2) NOT NULL
);
```

#### Assignments Table
```sql
CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  route_id INTEGER,
  driver_id INTEGER,
  assigned_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  driver_name VARCHAR(255),
  route_number VARCHAR(50),
  route_description TEXT,
  route_hours DECIMAL(10,2),
  driver_hours_remaining DECIMAL(10,2),
  FOREIGN KEY (route_id) REFERENCES routes(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);
```

### Relationships
- **One-to-Many**: Driver → Assignments
- **One-to-Many**: Route → Assignments
- **Many-to-Many**: Drivers ↔ Routes (through Assignments)

### Data Types
```typescript
// Core Types
export type Driver = {
  id: number;
  name: string;
  code: string;
  monthlyHoursTotal: string;
  monthlyHoursRemaining: string;
  status: string;
};

export type Route = {
  id: number;
  routeNumber: string;
  description: string;
  hoursRequired: string;
};

export type Assignment = {
  id: number;
  routeId: number | null;
  driverId: number | null;
  assignedDate: Date;
  status: string;
  driverName: string | null;
  routeNumber: string | null;
  routeDescription: string | null;
  routeHours: string | null;
  driverHoursRemaining: string | null;
};
```

## API Endpoints

### Driver Management
```http
GET /api/drivers
GET /api/drivers/:id
GET /api/drivers/:name
GET /api/drivers/:name/monthly-hours
POST /api/drivers
PUT /api/drivers/:id
```

### Route Management
```http
GET /api/routes
GET /api/routes/:id
POST /api/routes
```

### Assignment Management
```http
GET /api/assignments
GET /api/assignments?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
POST /api/assignments
PUT /api/assignments/:id
DELETE /api/assignments/:id
```

### OR-Tools Integration
```http
GET /api/ortools/drivers
GET /api/ortools/routes
POST /api/ortools/optimize
POST /api/ortools/apply
POST /api/ortools/validate
```

### Dashboard Statistics
```http
GET /api/dashboard/stats
```

### GPT Assistant API
```http
POST /api/gpt/optimize-day
GET /api/gpt/monthly-balance/:year/:month
GET /api/gpt/day-snapshot/:date
```

### API Response Formats

#### Success Response
```json
{
  "data": {...},
  "message": "Success message",
  "timestamp": "2025-01-07T12:00:00Z"
}
```

#### Error Response
```json
{
  "error": "Error message",
  "details": "Detailed error information",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-07T12:00:00Z"
}
```

## Frontend Components

### Core Components

#### Dashboard (`/client/src/pages/dashboard.tsx`)
Main application interface with:
- Weekly navigation
- Route assignment table
- Summary statistics
- OR-Tools optimizer
- Driver hours overview

#### WeeklyNavigation (`/client/src/components/weekly-navigation.tsx`)
Date selection component:
- Week-based navigation
- Date picker integration
- Real-time date updates

#### RouteTable (`/client/src/components/route-table.tsx`)
Assignment management:
- Sortable columns
- Real-time updates
- Delete functionality
- Status indicators

#### ORToolsOptimizer (`/client/src/components/ortools-optimizer.tsx`)
Optimization interface:
- Driver/route selection
- Optimization execution
- Result visualization
- Assignment application

#### DriversHoursOverview (`/client/src/components/drivers-hours-overview.tsx`)
Monthly hours tracking:
- Real-time hour calculations
- Status indicators
- Monthly summaries

### Component Architecture

#### State Management
```typescript
// TanStack Query for server state
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/drivers'],
  queryFn: () => fetch('/api/drivers').then(res => res.json())
});

// Mutations for data updates
const mutation = useMutation({
  mutationFn: (data) => apiRequest('POST', '/api/assignments', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
  }
});
```

#### Form Handling
```typescript
// React Hook Form with Zod validation
const form = useForm<InsertAssignment>({
  resolver: zodResolver(insertAssignmentSchema),
  defaultValues: {
    assignedDate: new Date(),
    status: 'pending'
  }
});
```

## OR-Tools Integration

### Mathematical Model

#### Decision Variables
```python
# Binary variables: x[i,j] = 1 if driver i assigned to route j
x = {}
for i in range(len(drivers)):
    for j in range(len(routes)):
        x[(i, j)] = solver.BoolVar(f'x_{i}_{j}')
```

#### Constraints
```python
# Each route assigned to exactly one driver
for j in range(len(routes)):
    solver.Add(sum(x[(i, j)] for i in range(len(drivers))) == 1)

# Each driver assigned to at most one route
for i in range(len(drivers)):
    solver.Add(sum(x[(i, j)] for j in range(len(routes))) <= 1)

# Driver capacity constraints
for i in range(len(drivers)):
    solver.Add(
        sum(x[(i, j)] * routes[j]['hours'] for j in range(len(routes))) 
        <= drivers[i]['available_hours']
    )
```

#### Objective Function
```python
# Maximize weighted assignments (prioritize drivers with more hours)
objective = solver.Objective()
for i in range(len(drivers)):
    for j in range(len(routes)):
        weight = drivers[i]['available_hours'] / total_available_hours
        objective.SetCoefficient(x[(i, j)], weight)
objective.SetMaximization()
```

### Optimization Workflow

#### 1. Data Preparation
```typescript
// Convert database data to OR-Tools format
const drivers = await convertDriversToORToolsFormat();
const routes = await convertRoutesToORToolsFormat();
const input = { drivers, routes };
```

#### 2. Optimization Execution
```python
# Execute optimization
status = solver.Solve()
if status == pywraplp.Solver.OPTIMAL:
    # Extract solution
    assignments = []
    for i in range(len(drivers)):
        for j in range(len(routes)):
            if x[(i, j)].solution_value() > 0.5:
                assignments.append({
                    'driver_name': drivers[i]['name'],
                    'route_name': routes[j]['name'],
                    'route_hours': routes[j]['hours']
                })
```

#### 3. Result Processing
```typescript
// Apply optimization results
const result = await solveDriverAssignment(input);
if (result.status === 'optimal') {
    await applyORToolsSolution(result, assignmentDate);
}
```

## GPT Assistant API

### LibreChat Action Configuration

#### Action Schema
```yaml
openapi: 3.0.0
info:
  title: Driver Route Assignment API
  version: "1.0.0"
paths:
  /api/gpt/optimize-day:
    post:
      summary: Optimize driver assignments for a specific day
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                selectedDate:
                  type: string
                  format: date
                additionalRoutes:
                  type: array
                  items:
                    type: object
                    properties:
                      name: { type: string }
                      hours: { type: number }
```

### Integration Workflow

#### 1. Day Optimization Request
```typescript
interface DayOptimizationRequest {
  selectedDate: string;
  additionalRoutes?: Array<{
    name: string;
    hours: number;
  }>;
  excludeDrivers?: string[];
  priorityRoutes?: string[];
}
```

#### 2. Optimization Response
```typescript
interface DayOptimizationResponse {
  success: boolean;
  date: string;
  optimization: {
    status: 'optimal' | 'infeasible' | 'error';
    assignments: Array<{
      driverName: string;
      routeName: string;
      routeHours: number;
      driverRemainingHours: number;
    }>;
    statistics: {
      totalRoutes: number;
      routesAssigned: number;
      routesUnassigned: number;
      driversWorking: number;
      driversAvailable: number;
      totalHoursAssigned: number;
      averageHoursPerDriver: number;
    };
    unassignedRoutes: string[];
    recommendations?: {
      message: string;
      suggestedActions: string[];
    };
  };
  databaseUpdated: boolean;
  message: string;
}
```

#### 3. Monthly Balance Reporting
```typescript
interface MonthlyBalanceReport {
  drivers: Array<{
    name: string;
    code: string;
    monthlyHoursTotal: number;
    monthlyHoursUsed: number;
    monthlyHoursRemaining: number;
    utilizationPercentage: number;
    status: 'critical' | 'low' | 'normal' | 'optimal';
  }>;
  summary: {
    totalDrivers: number;
    averageUtilization: number;
    criticalDrivers: number;
    lowHoursDrivers: number;
    optimalDrivers: number;
    totalMonthlyHours: number;
    totalHoursUsed: number;
    totalHoursRemaining: number;
  };
}
```

## Data Flow

### Client-Server Communication

#### 1. Initial Load
```
Client → GET /api/drivers → Server
Client → GET /api/routes → Server
Client → GET /api/assignments → Server
Client → GET /api/dashboard/stats → Server
```

#### 2. Assignment Creation
```
Client → POST /api/assignments → Server
Server → Storage Layer → Database
Server → Update Driver Hours → Database
Server → Response → Client
Client → Cache Invalidation → Re-fetch Data
```

#### 3. OR-Tools Optimization
```
Client → POST /api/ortools/optimize → Server
Server → Python OR-Tools Service → Optimization
Server → Result Processing → Client
Client → POST /api/ortools/apply → Server
Server → Bulk Assignment Creation → Database
```

### State Management Flow

#### TanStack Query Pattern
```typescript
// Query for data fetching
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/assignments', startDate, endDate],
  queryFn: () => fetchAssignments(startDate, endDate)
});

// Mutation for data updates
const mutation = useMutation({
  mutationFn: createAssignment,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
    queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
  }
});
```

## Storage Layer

### Interface Design
```typescript
export interface IStorage {
  // Driver operations
  getDrivers(): Promise<Driver[]>;
  getDriver(id: number): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: number, driver: Partial<InsertDriver>): Promise<Driver | undefined>;
  
  // Route operations
  getRoutes(): Promise<Route[]>;
  getRoute(id: number): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  
  // Assignment operations
  getAssignments(): Promise<Assignment[]>;
  getAssignmentsByDateRange(startDate: Date, endDate: Date): Promise<RouteAssignmentView[]>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: number, assignment: Partial<InsertAssignment>): Promise<Assignment | undefined>;
  deleteAssignment(id: number): Promise<boolean>;
  
  // Batch operations
  createBulkAssignments(assignments: InsertAssignment[]): Promise<Assignment[]>;
  
  // Monthly tracking
  calculateMonthlyHours(driverName: string, year: number, month: number): Promise<{
    totalHours: number;
    hoursUsed: number;
    hoursRemaining: number;
  }>;
  updateDriverMonthlyHours(driverName: string, totalHours: number): Promise<void>;
}
```

### Implementation Types

#### 1. Database Storage (PostgreSQL)
```typescript
export class DatabaseStorage implements IStorage {
  async getDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers);
  }
  
  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [newAssignment] = await db
      .insert(assignments)
      .values(assignment)
      .returning();
    
    // Update driver hours
    await this.updateDriverRemainingHours(assignment.driverName);
    
    return newAssignment;
  }
}
```

#### 2. Memory Storage (Development)
```typescript
export class MemStorage implements IStorage {
  private drivers: Driver[] = [];
  private routes: Route[] = [];
  private assignments: Assignment[] = [];
  
  async getDrivers(): Promise<Driver[]> {
    return [...this.drivers];
  }
  
  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const newAssignment = {
      id: this.nextAssignmentId++,
      ...assignment
    };
    
    this.assignments.push(newAssignment);
    this.updateDriverHours(assignment.driverName, assignment.routeHours);
    
    return newAssignment;
  }
}
```

## Deployment

### Environment Setup

#### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/driver_routes
PGHOST=localhost
PGPORT=5432
PGDATABASE=driver_routes
PGUSER=admin
PGPASSWORD=secure_password

# Application
NODE_ENV=production
PORT=5000
```

#### Development Setup
```bash
# Install dependencies
npm install

# Setup database
npm run db:push

# Start development server
npm run dev
```

#### Production Deployment
```bash
# Build application
npm run build

# Start production server
npm start
```

### Docker Configuration

#### Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/driver_routes
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=driver_routes
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## Configuration

### Application Configuration

#### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    cartographer(),
    runtimeErrorModal()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@assets': path.resolve(__dirname, './attached_assets')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5000
  }
});
```

#### Tailwind Configuration
```typescript
// tailwind.config.ts
export default {
  content: [
    "./client/src/**/*.{js,ts,jsx,tsx}",
    "./shared/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "hsl(var(--primary))",
        secondary: "hsl(var(--secondary))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};
```

#### Database Configuration
```typescript
// drizzle.config.ts
export default {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!
  }
};
```

### Performance Configuration

#### React Query Configuration
```typescript
// queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    },
    mutations: {
      retry: 1
    }
  }
});
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database status
npm run db:status

# Reset database
npm run db:reset

# Push schema changes
npm run db:push
```

#### 2. OR-Tools Python Service Issues
```bash
# Install Python dependencies
pip install ortools

# Test OR-Tools service
python server/ortools-service.py test
```

#### 3. Frontend Build Issues
```bash
# Clear cache
rm -rf node_modules
npm install

# Reset Vite cache
npx vite --clearCache
```

#### 4. Assignment Data Not Persisting
- Check memory storage vs database storage configuration
- Verify server restart doesn't reset data
- Check assignment creation endpoints

### Debug Mode

#### Enable Debug Logging
```typescript
// Add to server/index.ts
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, req.body);
    next();
  });
}
```

#### Monitor Database Queries
```typescript
// Add to server/db.ts
export const db = drizzle(pool, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
});
```

### Performance Monitoring

#### Query Performance
```typescript
// Monitor slow queries
const { data, isLoading, error, dataUpdatedAt } = useQuery({
  queryKey: ['/api/assignments'],
  queryFn: fetchAssignments,
  meta: {
    onSuccess: (data) => {
      console.log('Query completed:', dataUpdatedAt);
    }
  }
});
```

#### API Response Times
```typescript
// Add response time middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${duration}ms`);
  });
  next();
});
```

## Security Considerations

### Data Validation
- All API inputs validated with Zod schemas
- SQL injection prevention through parameterized queries
- Type safety enforced throughout the application

### Error Handling
- Comprehensive error boundaries in React components
- Server-side error logging and monitoring
- User-friendly error messages without exposing system details

### Performance Optimization
- Query caching with TanStack Query
- Database query optimization
- Efficient state management patterns

---

*Last Updated: January 7, 2025*
*Version: 1.0*

This documentation provides a comprehensive technical overview of the Driver Route Assignment System. For additional information or support, refer to the README.md file or contact the development team.