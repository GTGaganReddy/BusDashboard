# Driver Route Assignment System

A comprehensive route management platform that optimizes driver assignments, tracks hours, and provides real-time OR-Tools mathematical optimization across transportation operations.

## Features

- **Mathematical Optimization**: Google OR-Tools with SCIP solver for guaranteed optimal route assignments
- **Real-time Dashboard**: Weekly navigation, route tables, and summary statistics
- **Driver Management**: Automatic monthly hours tracking and workload balancing
- **GPT Assistant Integration**: LibreChat actions for intelligent workflow management
- **Responsive Design**: Modern React UI with Tailwind CSS and shadcn/ui components

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for development and build
- **Tailwind CSS** + **shadcn/ui** for styling
- **TanStack Query** for server state management
- **Wouter** for client-side routing

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **Drizzle ORM** for database operations
- **PostgreSQL** for persistent data storage
- **OR-Tools** (Python) for mathematical optimization

### Database Schema
- **Drivers**: Monthly hours tracking, status management
- **Routes**: Route details and hour requirements
- **Assignments**: Daily driver-route assignments with status tracking

## Prerequisites

Before installation, ensure you have:

- **Node.js** 18+ and npm
- **PostgreSQL** 12+ database server
- **Python** 3.8+ with pip
- **Git** for version control

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd driver-route-assignment-system
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies for OR-Tools
pip install ortools
```

### 3. Database Setup

#### Option A: PostgreSQL (Recommended for Production)
```bash
# Create database
createdb driver_routes

# Set environment variables
export DATABASE_URL="postgresql://username:password@localhost:5432/driver_routes"
export PGHOST="localhost"
export PGPORT="5432"
export PGDATABASE="driver_routes"
export PGUSER="your_username"
export PGPASSWORD="your_password"
```

#### Option B: In-Memory Storage (Development)
The system includes a fully functional in-memory storage option. No database setup required - perfect for testing and development.

### 4. Initialize Database (PostgreSQL only)
```bash
# Push database schema
npm run db:push

# Run initialization script
npx tsx init-db.ts
```

### 5. Configure Storage

Edit `server/storage.ts` to choose storage method:

**For PostgreSQL:**
```typescript
export const storage = new DatabaseStorage();
```

**For In-Memory (Development):**
```typescript
import { MemStorage } from './memory-storage';
export const storage = new MemStorage();
```

## Running the Application

### Development Mode
```bash
npm run dev
```
The application will be available at `http://localhost:5000`

### Production Build
```bash
# Build frontend
npm run build

# Start production server
npm start
```

## Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/driver_routes
PGHOST=localhost
PGPORT=5432
PGDATABASE=driver_routes
PGUSER=your_username
PGPASSWORD=your_password

# Application
NODE_ENV=production
PORT=5000
```

### Database Schema
The system automatically creates three main tables:

1. **drivers**: Driver information and monthly hours
2. **routes**: Route details and hour requirements  
3. **assignments**: Daily route-driver assignments

## API Endpoints

### Core Endpoints
- `GET /api/drivers` - Get all drivers with monthly hours
- `GET /api/routes` - Get all available routes
- `GET /api/assignments` - Get route assignments (with date filtering)
- `POST /api/assignments` - Create new assignments

### OR-Tools Optimization
- `GET /api/ortools/drivers` - Get drivers in OR-Tools format
- `GET /api/ortools/routes` - Get routes in OR-Tools format
- `POST /api/ortools/optimize` - Run optimization algorithm
- `POST /api/ortools/apply` - Apply optimization results

### Dashboard Statistics
- `GET /api/dashboard/stats` - Get dashboard summary statistics
- `GET /api/drivers/{name}/monthly-hours` - Get specific driver's monthly hours

## GPT Assistant Integration

The system includes LibreChat action configurations for GPT assistant integration:

### Available Actions
- **Day Optimization**: Complete workflow for optimizing daily assignments
- **Monthly Balance Report**: Generate driver workload balance reports
- **Driver Management**: Add, update, or remove drivers
- **Route Management**: Manage route definitions and requirements

### Configuration Files
- `updated-librechat-action.yaml` - Enhanced LibreChat action configuration
- `working-librechat-action.yaml` - Alternative configuration

## OR-Tools Mathematical Optimization

### Algorithm Details
- **Linear Programming**: Uses SCIP solver for optimal solutions
- **Binary Variables**: x[i,j] = 1 if driver i assigned to route j
- **Objective Function**: Maximize weighted assignments favoring drivers with more remaining hours
- **Constraints**: Route coverage, driver capacity, hour limits

### Optimization Workflow
1. **Pull Hours**: System retrieves current driver monthly hours
2. **Optimize**: OR-Tools calculates optimal assignments
3. **Apply**: Results are saved and driver hours updated

## Deployment

### Production Deployment

#### 1. Server Setup
```bash
# Install Node.js, PostgreSQL, Python
sudo apt update
sudo apt install nodejs npm postgresql python3 python3-pip

# Install PM2 for process management
npm install -g pm2
```

#### 2. Database Setup
```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE driver_routes;
CREATE USER routes_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE driver_routes TO routes_user;
```

#### 3. Application Deployment
```bash
# Clone and install
git clone <repository-url>
cd driver-route-assignment-system
npm install

# Set environment variables
export DATABASE_URL="postgresql://routes_user:secure_password@localhost:5432/driver_routes"

# Build and start
npm run build
pm2 start npm --name "driver-routes" -- start
```

#### 4. Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    depends_on:
      - db
    environment:
      - DATABASE_URL=postgresql://routes_user:password@db:5432/driver_routes
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=driver_routes
      - POSTGRES_USER=routes_user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Data Management

### Initial Data Setup
The system comes with pre-configured data:

- **21 Drivers**: Lenker 1-19 series plus Klagenfurt drivers
- **5 Sample Routes**: Various transportation routes
- **Clean Database**: No pre-existing assignments

### Backup and Restore
```bash
# Backup database
pg_dump driver_routes > backup.sql

# Restore database
psql driver_routes < backup.sql
```

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check PostgreSQL service
sudo systemctl status postgresql

# Check connection
psql -h localhost -U routes_user -d driver_routes
```

#### OR-Tools Python Errors
```bash
# Reinstall OR-Tools
pip install --upgrade ortools

# Check Python path
which python3
```

#### Build Errors
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode
Enable debug logging by setting:
```bash
export DEBUG=true
export NODE_ENV=development
```

## Performance Optimization

### Database Optimization
- Add indexes on frequently queried columns
- Use connection pooling for high-traffic environments
- Regular database maintenance and vacuuming

### Application Optimization
- Enable gzip compression
- Use CDN for static assets
- Implement caching strategies

## Security Considerations

### Database Security
- Use strong passwords for database users
- Enable SSL/TLS for database connections
- Regular security updates

### Application Security
- Implement rate limiting
- Use HTTPS in production
- Regular dependency updates

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Create an issue in the repository

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Changelog

- **July 2025**: Initial release with OR-Tools integration
- **July 2025**: Added GPT assistant LibreChat actions
- **July 2025**: Enhanced database support and deployment options