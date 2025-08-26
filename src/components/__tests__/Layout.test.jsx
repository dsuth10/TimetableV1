import { screen } from '@testing-library/react';
import { render } from '../../test-utils';
import Layout from '../Layout';

describe('Layout', () => {
  it('renders the app title', () => {
    render(<Layout>Test Content</Layout>);
    expect(screen.getByText('Timetable App')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Layout>Test Content</Layout>);
    
    // Use getAllByText and check that at least one instance exists
    const scheduleLinks = screen.getAllByText('Schedule');
    const aidesLinks = screen.getAllByText('Aides');
    const tasksLinks = screen.getAllByText('Tasks');
    const settingsLinks = screen.getAllByText('Settings');
    
    expect(scheduleLinks.length).toBeGreaterThan(0);
    expect(aidesLinks.length).toBeGreaterThan(0);
    expect(tasksLinks.length).toBeGreaterThan(0);
    expect(settingsLinks.length).toBeGreaterThan(0);
  });

  it('renders children content', () => {
    render(<Layout>Test Content</Layout>);
    
    // Use getAllByText since there might be multiple instances
    const testContentElements = screen.getAllByText('Test Content');
    expect(testContentElements.length).toBeGreaterThan(0);
  });

  it('has correct navigation links', () => {
    render(<Layout>Test Content</Layout>);
    
    // Get all navigation links and check their href attributes
    const scheduleLinks = screen.getAllByText('Schedule');
    const aidesLinks = screen.getAllByText('Aides');
    const tasksLinks = screen.getAllByText('Tasks');
    const settingsLinks = screen.getAllByText('Settings');

    // Check that at least one link has the correct href
    const scheduleLink = scheduleLinks.find(link => link.closest('a')?.getAttribute('href') === '/');
    const aidesLink = aidesLinks.find(link => link.closest('a')?.getAttribute('href') === '/aides');
    const tasksLink = tasksLinks.find(link => link.closest('a')?.getAttribute('href') === '/tasks');
    const settingsLink = settingsLinks.find(link => link.closest('a')?.getAttribute('href') === '/settings');

    expect(scheduleLink).toBeTruthy();
    expect(aidesLink).toBeTruthy();
    expect(tasksLink).toBeTruthy();
    expect(settingsLink).toBeTruthy();
  });
}); 