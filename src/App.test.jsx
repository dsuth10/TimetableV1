import { screen } from '@testing-library/react';
import { render } from './test-utils';
import App from './App';

describe('App', () => {
  it('renders the main application', () => {
    render(<App />);
    
    // Check that the app title is rendered (from Layout component)
    expect(screen.getByText('Timetable App')).toBeInTheDocument();
    
    // Check that the Schedule component is rendered (default route)
    expect(screen.getByText('Loading timetable...')).toBeInTheDocument();
  });
}); 