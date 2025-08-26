import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Create a theme for testing
const theme = createTheme();

// Custom render function that includes all necessary providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  initialEntries?: string[];
  useMemoryRouter?: boolean;
  initialSearchParams?: Record<string, string>;
}

const AllTheProviders = ({ 
  children, 
  route = '/', 
  initialEntries = ['/'], 
  useMemoryRouter = false,
  initialSearchParams = {}
}: { 
  children: React.ReactNode; 
  route?: string;
  initialEntries?: string[];
  useMemoryRouter?: boolean;
  initialSearchParams?: Record<string, string>;
}) => {
  const Router = useMemoryRouter ? MemoryRouter : BrowserRouter;
  
  // Build initial entries with search params
  const entriesWithParams = initialEntries.map(entry => {
    if (entry === '/' && Object.keys(initialSearchParams).length > 0) {
      const searchParams = new URLSearchParams(initialSearchParams);
      return `/?${searchParams.toString()}`;
    }
    return entry;
  });
  
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Router initialEntries={entriesWithParams}>
          {children}
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { route, initialEntries, useMemoryRouter, initialSearchParams, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders 
        route={route} 
        initialEntries={initialEntries} 
        useMemoryRouter={useMemoryRouter}
        initialSearchParams={initialSearchParams}
      >
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
