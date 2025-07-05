#!/usr/bin/env python3
import json
import sys
import itertools
from typing import List, Dict, Any, Tuple


def square_number(number):
    """
    Calculate the square of a number.

    Args:
        number (int or float): The number to square

    Returns:
        int or float: The squared result
    """
    return number**2


def solve_driver_assignment(data):
    """
    Solve driver assignment problem for a single day using a greedy algorithm.
    Assigns daily routes to drivers while considering their remaining monthly hours
    for even distribution across the month.

    Args:
        data (dict): Contains drivers (with monthly available hours) and routes (daily)

    Returns:
        dict: Assignment results with route-driver mapping for the day
    """
    drivers = data.get('drivers', [])
    routes = data.get('routes', [])

    if not drivers or not routes:
        raise ValueError("Both drivers and routes must be provided")

    # Create working copies
    available_drivers = [
        {**driver, 'original_index': i} 
        for i, driver in enumerate(drivers) 
        if driver['available_hours'] > 0
    ]
    available_routes = [
        {**route, 'original_index': i}
        for i, route in enumerate(routes)
    ]

    # Sort drivers by available hours (descending) for even distribution
    available_drivers.sort(key=lambda x: x['available_hours'], reverse=True)
    
    # Sort routes by hours (descending) to assign longest routes first
    available_routes.sort(key=lambda x: x['hours'], reverse=True)

    assignments = []
    driver_status = {}
    unassigned_routes = []

    # Initialize driver status
    for i, driver in enumerate(drivers):
        driver_status[i] = {
            'name': driver['name'],
            'assigned_route': None,
            'assigned_hours': 0,
            'remaining_hours': driver['available_hours']
        }

    # Try to assign each route to the best available driver
    for route in available_routes:
        best_driver = None
        best_score = -1

        # Find the best driver for this route
        for driver in available_drivers:
            # Check if driver can handle this route
            if driver['available_hours'] >= route['hours']:
                # Score: prioritize drivers with more hours (for distribution)
                # but also consider if they're already assigned
                hours_score = driver['available_hours'] / max(1, sum(d['available_hours'] for d in available_drivers))
                
                # Prefer unassigned drivers slightly
                assignment_bonus = 0.1 if driver_status[driver['original_index']]['assigned_route'] is None else 0
                
                score = hours_score + assignment_bonus
                
                if score > best_score:
                    best_score = score
                    best_driver = driver

        if best_driver:
            # Make the assignment
            assignment = {
                'driver_name': best_driver['name'],
                'route_name': route['name'],
                'route_hours': route['hours']
            }
            assignments.append(assignment)

            # Update driver status
            driver_idx = best_driver['original_index']
            driver_status[driver_idx]['assigned_route'] = route['name']
            driver_status[driver_idx]['assigned_hours'] = route['hours']
            driver_status[driver_idx]['remaining_hours'] = best_driver['available_hours'] - route['hours']

            # Update available hours for the driver
            best_driver['available_hours'] -= route['hours']
            
            # Remove driver if they have no more hours or are at capacity for one route per day
            # (assuming one route per driver per day constraint)
            available_drivers = [d for d in available_drivers if d != best_driver]
        else:
            # No suitable driver found
            unassigned_routes.append(route['name'])

    # Calculate statistics
    total_assigned_hours = sum(assignment['route_hours'] for assignment in assignments)
    
    return {
        'status': 'optimal',
        'assignments': assignments,
        'driver_status': list(driver_status.values()),
        'unassigned_routes': unassigned_routes,
        'statistics': {
            'total_routes': len(routes),
            'routes_assigned': len(assignments),
            'routes_unassigned': len(unassigned_routes),
            'total_hours_assigned': total_assigned_hours,
            'drivers_working': len(assignments),
            'drivers_available': len(drivers)
        },
        'objective_value': total_assigned_hours  # Simple objective: maximize assigned hours
    }


def validate_assignment_input(data):
    """
    Validate the input data for driver assignment.

    Args:
        data (dict): Input data to validate

    Returns:
        tuple: (is_valid, error_message)
    """
    if not isinstance(data, dict):
        return False, "Input must be a JSON object"

    if 'drivers' not in data or 'routes' not in data:
        return False, "Input must contain 'drivers' and 'routes' fields"

    drivers = data['drivers']
    routes = data['routes']

    if not isinstance(drivers, list) or not isinstance(routes, list):
        return False, "Both 'drivers' and 'routes' must be arrays"

    if len(drivers) == 0:
        return False, "At least one driver is required"

    if len(routes) == 0:
        return False, "At least one route is required"

    # Validate driver structure
    for i, driver in enumerate(drivers):
        if not isinstance(driver, dict):
            return False, f"Driver {i} must be an object"

        if 'name' not in driver or 'available_hours' not in driver:
            return False, f"Driver {i} must have 'name' and 'available_hours' fields"

        if not isinstance(driver['available_hours'],
                          (int, float)) or driver['available_hours'] < 0:
            return False, f"Driver {i} 'available_hours' must be a non-negative number"

    # Validate route structure
    for i, route in enumerate(routes):
        if not isinstance(route, dict):
            return False, f"Route {i} must be an object"

        if 'name' not in route or 'hours' not in route:
            return False, f"Route {i} must have 'name' and 'hours' fields"

        if not isinstance(route['hours'], (int, float)) or route['hours'] < 0:
            return False, f"Route {i} 'hours' must be a non-negative number"

    # Check if any driver can handle any route
    max_driver_hours = max(driver['available_hours'] for driver in drivers)
    min_route_hours = min(route['hours'] for route in routes)

    if max_driver_hours < min_route_hours:
        return False, f"No driver has enough hours ({max_driver_hours}) to handle the shortest route ({min_route_hours})"

    return True, ""


def update_driver_hours(drivers, assignments):
    """
    Update driver available hours after assignments.
    This function should be called after each day's assignment to update
    the drivers' remaining monthly hours.

    Args:
        drivers (list): List of driver dictionaries
        assignments (list): List of assignment dictionaries from solve_driver_assignment

    Returns:
        list: Updated drivers list with reduced available hours
    """
    updated_drivers = []

    # Create a mapping of driver names to assigned hours
    assignment_map = {}
    for assignment in assignments:
        assignment_map[assignment['driver_name']] = assignment['route_hours']

    # Update each driver's available hours
    for driver in drivers:
        updated_driver = driver.copy()
        assigned_hours = assignment_map.get(driver['name'], 0)
        updated_driver['available_hours'] = max(
            0, driver['available_hours'] - assigned_hours)
        updated_drivers.append(updated_driver)

    return updated_drivers


def main():
    """
    Main function to handle command-line interface for OR-Tools operations.
    """
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No operation specified"}))
        sys.exit(1)

    operation = sys.argv[1]

    if operation == "square":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Number required for square operation"}))
            sys.exit(1)
        
        try:
            number = float(sys.argv[2])
            result = square_number(number)
            print(json.dumps({"result": result}))
        except ValueError:
            print(json.dumps({"error": "Invalid number format"}))
            sys.exit(1)

    elif operation == "solve":
        # Read JSON data from stdin
        try:
            input_data = json.load(sys.stdin)
            
            # Validate input
            is_valid, error_msg = validate_assignment_input(input_data)
            if not is_valid:
                print(json.dumps({"error": error_msg}))
                sys.exit(1)
            
            # Solve the problem
            result = solve_driver_assignment(input_data)
            print(json.dumps(result))
            
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON input"}))
            sys.exit(1)
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.exit(1)

    elif operation == "validate":
        # Read JSON data from stdin
        try:
            input_data = json.load(sys.stdin)
            is_valid, error_msg = validate_assignment_input(input_data)
            
            print(json.dumps({
                "valid": is_valid,
                "message": error_msg if not is_valid else "Input is valid"
            }))
            
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON input"}))
            sys.exit(1)
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.exit(1)

    else:
        print(json.dumps({"error": f"Unknown operation: {operation}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()