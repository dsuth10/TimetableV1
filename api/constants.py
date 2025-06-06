from enum import Enum

class Status(str, Enum):
    """Status enum for assignments and tasks."""
    UNASSIGNED = 'UNASSIGNED'
    ASSIGNED = 'ASSIGNED'
    IN_PROGRESS = 'IN_PROGRESS'
    COMPLETE = 'COMPLETE' 