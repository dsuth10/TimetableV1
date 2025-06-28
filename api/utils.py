from typing import Tuple, Dict, Any

def error_response(code: str, message: str, status: int) -> Tuple[Dict[str, Any], int]:
    """Return a standardized error response.
    
    Args:
        code: Error code identifier
        message: Human-readable error message
        status: HTTP status code
        
    Returns:
        Tuple containing the error response dict and status code
    """
    return {'error': code, 'message': message}, status 