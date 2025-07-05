# GPT Assistant Setup Guide for LibreChat

## Overview
This guide helps you set up a GPT assistant that can intelligently manage your driver route optimization system using LibreChat actions.

## Your System Architecture

### Intelligent Workflow
Your GPT assistant will follow this smart workflow:

1. **Daily Analysis**: Analyzes available drivers and routes for the selected day
2. **Smart Selection**: Considers monthly hour balance to select optimal drivers
3. **OR Tools Optimization**: Uses Python algorithms to find the best assignments
4. **Balance Optimization**: Ensures all drivers are on the same level (even distribution)
5. **Database Updates**: Automatically saves results and updates driver hours
6. **Intelligent Recommendations**: Provides suggestions for improvements

### Key Features
- **One Driver Per Route**: Each route gets exactly one driver
- **Monthly Hour Balance**: Considers remaining monthly hours for fair distribution
- **Real-time Updates**: Database updates immediately after optimization
- **Smart Recommendations**: AI suggests improvements and identifies issues

## LibreChat Actions Configuration

### Base URL Setup
Replace `{BASE_URL}` with your actual Replit URL:
```
https://your-replit-name.your-username.replit.app/api
```

### Core Actions

#### 1. Route Optimization (Main Action)
```json
{
  "name": "optimize_routes",
  "description": "Optimize driver route assignments for a specific day",
  "method": "POST",
  "url": "{BASE_URL}/ortools/solve",
  "headers": {
    "Content-Type": "application/json"
  }
}
```

#### 2. Apply Optimization Results
```json
{
  "name": "apply_assignments",
  "description": "Apply optimization results to database",
  "method": "POST",
  "url": "{BASE_URL}/ortools/apply",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "solution": "{solution}",
    "assignedDate": "{date}"
  }
}
```

#### 3. Get Driver Availability
```json
{
  "name": "get_drivers",
  "description": "Get all available drivers with their monthly hours",
  "method": "GET",
  "url": "{BASE_URL}/ortools/drivers"
}
```

#### 4. Get Routes
```json
{
  "name": "get_routes",
  "description": "Get all routes that need assignments",
  "method": "GET",
  "url": "{BASE_URL}/ortools/routes"
}
```

#### 5. Get Current Status
```json
{
  "name": "get_assignments",
  "description": "Get current assignments and dashboard stats",
  "method": "GET",
  "url": "{BASE_URL}/assignments"
}
```

## GPT Assistant Prompts

### System Prompt
```
You are an intelligent driver route optimization assistant. Your role is to:

1. Analyze available drivers and their monthly hour balance
2. Optimize route assignments using OR Tools
3. Ensure fair distribution of work across all drivers
4. Apply results to the database automatically
5. Provide intelligent recommendations

Key Rules:
- Always assign exactly one driver per route
- Consider monthly hours remaining for balance
- Use OR Tools for optimization calculations
- Update database after successful optimization
- Provide clear explanations of your decisions

When a user asks for route optimization:
1. First get current driver availability
2. Get routes that need assignment
3. Run OR Tools optimization
4. Apply results if optimization is successful
5. Provide summary and recommendations
```

### Example User Interactions

#### Daily Optimization
**User**: "Optimize routes for today"

**Assistant Actions**:
1. `get_drivers` - Check available drivers
2. `get_routes` - Get routes needing assignment
3. `optimize_routes` - Run OR Tools optimization
4. `apply_assignments` - Save results to database
5. Provide summary and recommendations

#### Monthly Balance Check
**User**: "Which drivers need more work this month?"

**Assistant Actions**:
1. `get_drivers` - Get driver availability
2. Analyze monthly hours remaining
3. Identify drivers with high remaining hours
4. Suggest adding more routes or redistributing work

#### Smart Recommendations
**User**: "How can we improve our scheduling?"

**Assistant Actions**:
1. `get_assignments` - Get current assignments
2. `get_drivers` - Analyze driver balance
3. Identify patterns and inefficiencies
4. Suggest specific improvements

## Response Formats

### Successful Optimization
```json
{
  "status": "optimal",
  "assignments": [
    {
      "driver_name": "Lenker 3",
      "route_name": "RT-002 - Suburban Express",
      "route_hours": 10
    }
  ],
  "statistics": {
    "total_routes": 5,
    "routes_assigned": 5,
    "drivers_working": 5,
    "total_hours_assigned": 41.5
  }
}
```

### Driver Availability
```json
[
  {
    "name": "Mike Rodriguez",
    "available_hours": 89.3
  },
  {
    "name": "Lisa Chen",
    "available_hours": 3.1
  }
]
```

## Testing Your Setup

### 1. Test Driver Availability
```bash
curl -X GET "https://your-app.replit.app/api/ortools/drivers"
```

### 2. Test Route Optimization
```bash
curl -X POST "https://your-app.replit.app/api/ortools/solve" \
  -H "Content-Type: application/json"
```

### 3. Test Apply Results
```bash
curl -X POST "https://your-app.replit.app/api/ortools/apply" \
  -H "Content-Type: application/json" \
  -d '{
    "solution": {optimization_result},
    "assignedDate": "2025-01-05"
  }'
```

## Advanced Features

### Custom Route Addition
Your GPT assistant can add custom routes during optimization:

```json
{
  "name": "add_custom_route",
  "description": "Add a custom route during optimization",
  "method": "POST",
  "url": "{BASE_URL}/ortools/solve-custom",
  "body": {
    "drivers": [
      {"name": "Driver Name", "available_hours": 160}
    ],
    "routes": [
      {"name": "Custom Route", "hours": 8}
    ]
  }
}
```

### Monthly Hour Tracking
The system automatically tracks monthly hours:
- Updates remaining hours after each assignment
- Considers monthly balance for fair distribution
- Provides status indicators (active, critical, low)

### Smart Recommendations
The OR Tools integration provides intelligent suggestions:
- Identifies overworked vs underutilized drivers
- Suggests optimal route redistributions
- Recommends when to add more drivers or routes

## Troubleshooting

### Common Issues

1. **"No available drivers"**: Check if drivers have remaining monthly hours
2. **"Infeasible solution"**: Routes require more hours than available drivers can provide
3. **"Unbalanced assignments"**: System automatically balances, but extreme imbalances may need manual adjustment

### Debug Commands
```bash
# Check system health
curl -X GET "https://your-app.replit.app/api/dashboard/stats"

# Verify OR Tools is working
curl -X POST "https://your-app.replit.app/api/ortools/square" \
  -H "Content-Type: application/json" \
  -d '{"number": 5}'
```

## Benefits of Your Setup

1. **Intelligent Automation**: GPT assistant handles the complete optimization workflow
2. **Fair Distribution**: OR Tools ensures balanced workload across all drivers
3. **Real-time Updates**: Database updates immediately after optimization
4. **Monthly Balance**: Considers long-term hour distribution for sustainability
5. **Smart Recommendations**: AI provides actionable insights for improvements
6. **Single Database**: No external sync needed, everything in one system

Your GPT assistant will now intelligently manage your entire driver route optimization system, providing fair assignments and continuous improvements!