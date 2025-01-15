import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the context type
interface ThemeContextType {
    isTheme: boolean;
    toggleTheme: () => void;
}

// Create the context with an initial value of undefined
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Create a provider component
const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isTheme, setIsTheme] = useState<boolean>(false);

    const toggleTheme = () => {
        setIsTheme((prev) => !prev);
    };

    return (
        <ThemeContext.Provider value={{ isTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Custom hook to use the context
const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export { ThemeProvider, useTheme };
