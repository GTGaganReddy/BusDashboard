from ortools.linear_solver import pywraplp
import json


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
    Solve driver assignment problem for a single day using OR-Tools.
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

    # Create the solver
    solver = pywraplp.Solver.CreateSolver('SCIP')
    if not solver:
        raise RuntimeError("SCIP solver unavailable")

    num_drivers = len(drivers)
    num_routes = len(routes)

    # Create binary variables: x[i][j] = 1 if driver i is assigned to route j
    x = {}
    for i in range(num_drivers):
        for j in range(num_routes):
            x[i, j] = solver.IntVar(0, 1, f'driver_{i}_route_{j}')

    # Constraint 1: Each route is assigned to exactly one driver
    for j in range(num_routes):
        solver.Add(solver.Sum([x[i, j] for i in range(num_drivers)]) == 1)

    # Constraint 2: Each driver can be assigned to at most one route per day
    for i in range(num_drivers):
        solver.Add(solver.Sum([x[i, j] for j in range(num_routes)]) <= 1)

    # Constraint 3: Driver's assigned hours don't exceed their remaining monthly hours
    for i in range(num_drivers):
        daily_hours = solver.Sum(
            [x[i, j] * routes[j]['hours'] for j in range(num_routes)])
        solver.Add(daily_hours <= drivers[i]['available_hours'])

    # Objective: Prioritize drivers with more remaining hours for even distribution
    # This helps balance workload across the month
    objective = solver.Objective()

    # Calculate total remaining hours for normalization
    total_remaining_hours = sum(driver['available_hours']
                                for driver in drivers)

    for i in range(num_drivers):
        for j in range(num_routes):
            # Weight by remaining hours - drivers with more remaining hours get priority
            # This ensures even distribution over the month
            if total_remaining_hours > 0:
                weight = drivers[i]['available_hours'] / total_remaining_hours
            else:
                weight = 1.0
            objective.SetCoefficient(x[i, j], weight)

    objective.SetMaximization()

    # Solve the problem
    status = solver.Solve()

    if status == pywraplp.Solver.OPTIMAL:
        assignments = []
        unassigned_routes = []
        driver_assignments = {}

        # Initialize driver assignments
        for i in range(num_drivers):
            driver_assignments[i] = {
                'name': drivers[i]['name'],
                'assigned_route': None,
                'assigned_hours': 0,
                'remaining_hours': drivers[i]['available_hours']
            }

        # Process assignments
        for i in range(num_drivers):
            for j in range(num_routes):
                if x[i, j].solution_value() > 0.5:  # Binary variable is 1
                    assignment = {
                        'driver_name': drivers[i]['name'],
                        'route_name': routes[j]['name'],
                        'route_hours': routes[j]['hours']
                    }
                    assignments.append(assignment)

                    # Update driver assignment info
                    driver_assignments[i]['assigned_route'] = routes[j]['name']
                    driver_assignments[i]['assigned_hours'] = routes[j][
                        'hours']
                    driver_assignments[i]['remaining_hours'] = (
                        drivers[i]['available_hours'] - routes[j]['hours'])

        # Find unassigned routes
        assigned_routes = {
            assignment['route_name']
            for assignment in assignments
        }
        for route in routes:
            if route['name'] not in assigned_routes:
                unassigned_routes.append(route['name'])

        # Calculate statistics
        total_assigned_hours = sum(assignment['route_hours']
                                   for assignment in assignments)

        return {
            'status': 'optimal',
            'assignments': assignments,
            'driver_status': list(driver_assignments.values()),
            'unassigned_routes': unassigned_routes,
            'statistics': {
                'total_routes': len(routes),
                'routes_assigned': len(assignments),
                'routes_unassigned': len(unassigned_routes),
                'total_hours_assigned': total_assigned_hours,
                'drivers_working': len(assignments),
                'drivers_available': num_drivers
            },
            'objective_value': solver.Objective().Value()
        }

    elif status == pywraplp.Solver.INFEASIBLE:
        return {
            'status':
            'infeasible',
            'message':
            'No feasible solution found. Possible reasons:\n'
            '1. Total route hours exceed total available driver hours\n'
            '2. Individual driver remaining hours are insufficient\n'
            '3. More routes than available drivers'
        }

    else:
        return {
            'status': 'error',
            'message': 'Solver failed to find a solution'
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
    import sys

    if len(sys.argv) < 2:
        print("Error: Operation not specified")
        sys.exit(1)

    operation = sys.argv[1]

    if operation == "square":
        if len(sys.argv) < 3:
            print("Error: Number not specified")
            sys.exit(1)
        try:
            number = float(sys.argv[2])
            result = square_number(number)
            print(json.dumps({"result": result}))
        except ValueError:
            print("Error: Invalid number")
            sys.exit(1)

    elif operation == "solve_assignment":
        # Read JSON from stdin
        input_data = sys.stdin.read()
        try:
            data = json.loads(input_data)
            
            # Validate input
            is_valid, error_msg = validate_assignment_input(data)
            if not is_valid:
                print(json.dumps({"status": "error", "message": error_msg}))
                sys.exit(1)
            
            result = solve_driver_assignment(data)
            print(json.dumps(result))
        except json.JSONDecodeError:
            print("Error: Invalid JSON input")
            sys.exit(1)
        except Exception as e:
            print(json.dumps({"status": "error", "message": str(e)}))
            sys.exit(1)

    elif operation == "validate":
        # Read JSON from stdin
        input_data = sys.stdin.read()
        try:
            data = json.loads(input_data)
            is_valid, error_msg = validate_assignment_input(data)
            print(json.dumps({"valid": is_valid, "message": error_msg}))
        except json.JSONDecodeError:
            print("Error: Invalid JSON input")
            sys.exit(1)

    else:
        print(f"Error: Unknown operation '{operation}'")
        sys.exit(1)


if __name__ == "__main__":
    main()