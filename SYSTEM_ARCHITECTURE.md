# System Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  React Dashboard (Port 5000)                                              │
│  ├── Pages: Dashboard, Not Found                                          │
│  ├── Components: RouteTable, WeeklyNavigation, ORToolsOptimizer          │
│  ├── State: TanStack Query + React State                                  │
│  └── Styling: Tailwind CSS + shadcn/ui                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/API Calls
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVER LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Express.js API Server (Port 5000)                                        │
│  ├── Routes: /api/drivers, /api/routes, /api/assignments                  │
│  ├── Middleware: CORS, JSON Parser, Error Handler                         │
│  ├── Validation: Zod Schemas                                              │
│  └── Static: Vite Build Assets                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Storage Interface
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          STORAGE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  IStorage Interface                                                        │
│  ├── DatabaseStorage (PostgreSQL + Drizzle ORM)                          │
│  └── MemStorage (In-Memory for Development)                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Database Queries
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database (Neon Serverless)                                    │
│  ├── Tables: drivers, routes, assignments                                 │
│  ├── Relations: Foreign Keys, Indexes                                     │
│  └── Migrations: Drizzle Kit                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        OPTIMIZATION LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Python OR-Tools Service                                                  │
│  ├── Algorithm: Linear Programming with SCIP Solver                       │
│  ├── Input: Drivers (available hours) + Routes (required hours)          │
│  ├── Constraints: Route coverage, driver capacity, hour limits            │
│  └── Output: Optimal assignments with statistics                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ REST API
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL INTEGRATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  GPT Assistant API (LibreChat Actions)                                    │
│  ├── Endpoints: /api/gpt/optimize-day, /api/gpt/monthly-balance          │
│  ├── Features: Complete day optimization, intelligent recommendations     │
│  └── Workflow: Analyze → Optimize → Apply → Report                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │    │   React     │    │   Express   │    │  Storage    │
│             │    │ Components  │    │   Server    │    │   Layer     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
        │                  │                  │                  │
        │ User Interaction │                  │                  │
        │─────────────────▶│                  │                  │
        │                  │ API Request      │                  │
        │                  │─────────────────▶│                  │
        │                  │                  │ Query/Update     │
        │                  │                  │─────────────────▶│
        │                  │                  │                  │
        │                  │                  │ Result           │
        │                  │                  │◀─────────────────│
        │                  │ Response         │                  │
        │                  │◀─────────────────│                  │
        │ UI Update        │                  │                  │
        │◀─────────────────│                  │                  │
        │                  │                  │                  │
```

## Component Interaction

```
Dashboard Page
├── WeeklyNavigation
│   ├── Date Selection
│   └── Week Navigation
├── SummaryCards
│   ├── Statistics Display
│   └── Real-time Updates
├── RouteTable
│   ├── Assignment Display
│   ├── Delete Functionality
│   └── Status Indicators
├── ORToolsOptimizer
│   ├── Driver/Route Selection
│   ├── Optimization Execution
│   └── Result Application
└── DriversHoursOverview
    ├── Monthly Hours Display
    ├── Status Indicators
    └── Real-time Calculations
```

## Technology Stack Integration

```
Frontend Stack:
React 18 → TypeScript → Vite → Tailwind CSS → shadcn/ui

Backend Stack:
Node.js → Express.js → TypeScript → Zod Validation

Database Stack:
PostgreSQL → Drizzle ORM → Neon Serverless

Optimization Stack:
Python → OR-Tools → SCIP Solver → Linear Programming

State Management:
TanStack Query → React State → Local Storage

Build & Deploy:
Vite → ESBuild → Replit → Docker (optional)
```

## Security & Performance

```
Security Layers:
├── Input Validation (Zod Schemas)
├── SQL Injection Prevention (Parameterized Queries)
├── Type Safety (TypeScript)
├── Error Boundaries (React)
└── CORS Configuration

Performance Optimizations:
├── Query Caching (TanStack Query)
├── Database Indexing
├── Efficient State Updates
├── Code Splitting (Vite)
└── CDN Assets
```

## Deployment Architecture

```
Development Environment:
├── Vite Dev Server (Hot Reload)
├── Express Server (tsx)
├── In-Memory Storage
└── Python OR-Tools Service

Production Environment:
├── Static Build (Vite)
├── Express Server (Production)
├── PostgreSQL Database
├── Python OR-Tools Service
└── Environment Variables
```

This architecture provides:
- **Scalability**: Modular components and services
- **Maintainability**: Clear separation of concerns
- **Performance**: Optimized data flow and caching
- **Security**: Multiple validation layers
- **Reliability**: Error handling and fallback mechanisms
- **Flexibility**: Abstract interfaces for easy swapping of implementations