# Frontend Components

## Core Components

### SchedulePage
The main layout component for the scheduling interface.

```typescript
interface SchedulePageProps {
    weekStart: Date;
    onWeekChange: (date: Date) => void;
}

const SchedulePage: React.FC<SchedulePageProps> = ({ weekStart, onWeekChange }) => {
    const { assignments, isLoading, error } = useScheduleStore(weekStart);

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage error={error} />;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <WeekSelector
                weekStart={weekStart}
                onWeekChange={onWeekChange}
            />
            <TimetableGrid
                weekStart={weekStart}
                assignments={assignments}
            />
            <UnassignedTaskList />
        </Box>
    );
};
```

### TimetableGrid
Displays the weekly schedule in a grid layout.

```typescript
interface TimetableGridProps {
    weekStart: Date;
    assignments: Assignment[];
}

const TimetableGrid: React.FC<TimetableGridProps> = ({ weekStart, assignments }) => {
    const timeSlots = generateTimeSlots();
    const weekDays = generateWeekDays(weekStart);
    const { handleDragStart, handleDrop } = useDragAndDrop();

    return (
        <Grid container spacing={1}>
            <Grid item xs={1}>
                <TimeColumn timeSlots={timeSlots} />
            </Grid>
            {weekDays.map(day => (
                <Grid item xs={2.2} key={day.toISOString()}>
                    <DayColumn
                        date={day}
                        timeSlots={timeSlots}
                        assignments={assignments.filter(a => isSameDay(a.date, day))}
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                    />
                </Grid>
            ))}
        </Grid>
    );
};
```

### TaskCard
A draggable card representing a task or assignment.

```typescript
interface TaskCardProps {
    task: Task | Assignment;
    isDragging?: boolean;
    onDoubleClick?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, isDragging, onDoubleClick }) => {
    const { color } = useTaskColor(task);
    const { dragRef } = useDrag({
        type: 'TASK',
        item: task,
        collect: monitor => ({
            isDragging: monitor.isDragging()
        })
    });

    return (
        <Card
            ref={dragRef}
            sx={{
                backgroundColor: color,
                opacity: isDragging ? 0.5 : 1,
                cursor: 'move',
                '&:hover': {
                    boxShadow: 3
                }
            }}
            onDoubleClick={onDoubleClick}
        >
            <CardContent>
                <Typography variant="subtitle2">{task.title}</Typography>
                <Typography variant="caption">
                    {formatTime(task.start_time)} - {formatTime(task.end_time)}
                </Typography>
            </CardContent>
        </Card>
    );
};
```

### ConflictModal
Modal for resolving scheduling conflicts.

```typescript
interface ConflictModalProps {
    open: boolean;
    conflicts: Assignment[];
    onResolve: (resolution: ConflictResolution) => void;
    onClose: () => void;
}

const ConflictModal: React.FC<ConflictModalProps> = ({
    open,
    conflicts,
    onResolve,
    onClose
}) => {
    const [resolution, setResolution] = useState<ConflictResolution>('KEEP_EXISTING');

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Schedule Conflict Detected</DialogTitle>
            <DialogContent>
                <Typography>
                    The following assignments conflict with your selection:
                </Typography>
                <List>
                    {conflicts.map(conflict => (
                        <ListItem key={conflict.id}>
                            <ListItemText
                                primary={conflict.task.title}
                                secondary={`${formatTime(conflict.start_time)} - ${formatTime(conflict.end_time)}`}
                            />
                        </ListItem>
                    ))}
                </List>
                <FormControl component="fieldset">
                    <RadioGroup
                        value={resolution}
                        onChange={e => setResolution(e.target.value as ConflictResolution)}
                    >
                        <FormControlLabel
                            value="KEEP_EXISTING"
                            control={<Radio />}
                            label="Keep existing assignments"
                        />
                        <FormControlLabel
                            value="REPLACE"
                            control={<Radio />}
                            label="Replace with new assignment"
                        />
                    </RadioGroup>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={() => onResolve(resolution)}
                    variant="contained"
                    color="primary"
                >
                    Resolve
                </Button>
            </DialogActions>
        </Dialog>
    );
};
```

## Custom Hooks

### useScheduleStore
Global state management for the schedule.

```typescript
interface ScheduleState {
    assignments: Assignment[];
    isLoading: boolean;
    error: Error | null;
    fetchAssignments: (weekStart: Date) => Promise<void>;
    updateAssignment: (assignment: Assignment) => Promise<void>;
}

const useScheduleStore = create<ScheduleState>((set, get) => ({
    assignments: [],
    isLoading: false,
    error: null,
    fetchAssignments: async (weekStart: Date) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.getAssignments(weekStart);
            set({ assignments: response.data, isLoading: false });
        } catch (error) {
            set({ error, isLoading: false });
        }
    },
    updateAssignment: async (assignment: Assignment) => {
        try {
            await api.updateAssignment(assignment);
            const assignments = get().assignments.map(a =>
                a.id === assignment.id ? assignment : a
            );
            set({ assignments });
        } catch (error) {
            set({ error });
        }
    }
}));
```

### useDragAndDrop
Hook for handling drag-and-drop functionality.

```typescript
interface DragAndDropHandlers {
    handleDragStart: (task: Task | Assignment) => void;
    handleDrop: (date: Date, timeSlot: TimeSlot) => void;
}

const useDragAndDrop = (): DragAndDropHandlers => {
    const { updateAssignment } = useScheduleStore();
    const [isDragging, setIsDragging] = useState(false);

    const handleDragStart = (task: Task | Assignment) => {
        setIsDragging(true);
    };

    const handleDrop = async (date: Date, timeSlot: TimeSlot) => {
        setIsDragging(false);
        // Handle drop logic
    };

    return { handleDragStart, handleDrop };
};
```

## Utility Functions

### Time Slot Generation
```typescript
const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    let currentTime = new Date();
    currentTime.setHours(8, 0, 0); // Start at 8:00 AM

    while (currentTime.getHours() < 16) { // End at 4:00 PM
        slots.push({
            start: new Date(currentTime),
            end: new Date(currentTime.getTime() + 30 * 60000) // 30-minute slots
        });
        currentTime.setMinutes(currentTime.getMinutes() + 30);
    }

    return slots;
};
```

### Time Formatting
```typescript
const formatTime = (time: string | Date): string => {
    const date = typeof time === 'string' ? new Date(`2000-01-01T${time}`) : time;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
```

### Time Slot Validation
```typescript
const isValidTimeSlot = (start: Date, end: Date): boolean => {
    const schoolStart = new Date();
    schoolStart.setHours(8, 0, 0);
    const schoolEnd = new Date();
    schoolEnd.setHours(16, 0, 0);

    return start >= schoolStart && end <= schoolEnd && start < end;
};
```

## Styling

The application uses Material-UI's styling system with a custom theme:

```typescript
const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0'
        },
        secondary: {
            main: '#9c27b0',
            light: '#ba68c8',
            dark: '#7b1fa2'
        }
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    transition: 'all 0.2s ease-in-out'
                }
            }
        }
    }
});
```

## Testing

Example test for the TaskCard component:

```typescript
describe('TaskCard', () => {
    const mockTask: Task = {
        id: 1,
        title: 'Test Task',
        start_time: '09:00',
        end_time: '10:00',
        category: 'CLASS_SUPPORT'
    };

    it('renders task information correctly', () => {
        render(<TaskCard task={mockTask} />);
        expect(screen.getByText('Test Task')).toBeInTheDocument();
        expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
    });

    it('handles double click', () => {
        const onDoubleClick = jest.fn();
        render(<TaskCard task={mockTask} onDoubleClick={onDoubleClick} />);
        fireEvent.doubleClick(screen.getByText('Test Task'));
        expect(onDoubleClick).toHaveBeenCalled();
    });
});
``` 