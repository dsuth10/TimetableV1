import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout';

describe('Layout', () => {
  const renderWithRouter = (component) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  it('renders the app title', () => {
    renderWithRouter(<Layout>Test Content</Layout>);
    expect(screen.getByText('Timetable App')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderWithRouter(<Layout>Test Content</Layout>);
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Aides')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders children content', () => {
    renderWithRouter(<Layout>Test Content</Layout>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('has correct navigation links', () => {
    renderWithRouter(<Layout>Test Content</Layout>);
    const scheduleLink = screen.getByText('Schedule');
    const aidesLink = screen.getByText('Aides');
    const tasksLink = screen.getByText('Tasks');
    const settingsLink = screen.getByText('Settings');

    expect(scheduleLink.closest('a')).toHaveAttribute('href', '/');
    expect(aidesLink.closest('a')).toHaveAttribute('href', '/aides');
    expect(tasksLink.closest('a')).toHaveAttribute('href', '/tasks');
    expect(settingsLink.closest('a')).toHaveAttribute('href', '/settings');
  });
}); 