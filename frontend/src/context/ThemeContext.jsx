import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, otherwise fallback to "dark"
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sentinel-theme");
      if (stored === "dark" || stored === "light") {
        return stored;
      }
    }
    return "dark";
  });

  useEffect(() => {
    // Apply the data-theme attribute to the root html element
    document.documentElement.setAttribute("data-theme", theme);
    // Persist to localStorage
    localStorage.setItem("sentinel-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
