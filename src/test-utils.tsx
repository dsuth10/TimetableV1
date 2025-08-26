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
}

const AllTheProviders = ({ children, route = '/', initialEntries = ['/'], useMemoryRouter = false }: { 
  children: React.ReactNode; 
  route?: string;
  initialEntries?: string[];
  useMemoryRouter?: boolean;
}) => {
  const Router = useMemoryRouter ? MemoryRouter : BrowserRouter;
  
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Router initialEntries={initialEntries}>
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
  const { route, initialEntries, useMemoryRouter, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders 
        route={route} 
        initialEntries={initialEntries} 
        useMemoryRouter={useMemoryRouter}
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
