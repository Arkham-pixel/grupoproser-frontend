// src/hooks/useThemeStyles.js
import { useTheme } from '../context/ThemeContext';

export const useThemeStyles = () => {
  const { theme } = useTheme();

  const getThemeClass = (lightClass, darkClass) => {
    return theme === 'dark' ? darkClass : lightClass;
  };

  const getThemeStyle = (lightStyle, darkStyle) => {
    return theme === 'dark' ? darkStyle : lightStyle;
  };

  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    getThemeClass,
    getThemeStyle,
    // Clases comunes para modo oscuro
    bgCard: getThemeClass('bg-white', 'bg-[#1E1E1E]'),
    bgMain: getThemeClass('bg-[#F5F5F7]', 'bg-[#121212]'),
    textPrimary: getThemeClass('text-[#1E1E1E]', 'text-[#E5E5E5]'),
    textSecondary: getThemeClass('text-[#6B6B6B]', 'text-[#B0B0B0]'),
    borderColor: getThemeClass('border-[#E6E6E6]', 'border-[#2D2D2D]'),
    // Para inputs y selects
    inputClass: getThemeClass(
      'bg-white border-gray-300 text-gray-900',
      'bg-[#1E1E1E] border-[#2D2D2D] text-[#E5E5E5]'
    ),
    // Para tablas
    tableBg: getThemeClass('bg-white', 'bg-[#1E1E1E]'),
    tableHeaderBg: getThemeClass('bg-[#F8F9FA]', 'bg-[#252525]'),
    tableRowHover: getThemeClass('hover:bg-gray-50', 'hover:bg-[#2A2A2A]'),
  };
};

