/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class', // Habilita el modo oscuro usando la clase 'dark'
  theme: {
    extend: {
      colors: {
        // Paleta Arnald DataFlow - Corporativa y Profesional
        fenix: {
          // Colores principales - Rojo transparente elegante
          primario: '#DC2626',        // Rojo vibrante - Color principal
          secundario: '#EF4444',      // Rojo suave - Hover, degradado suave
          terciario: 'rgba(220, 38, 38, 0.1)',  // Rojo transparente - Fondos y elementos tenues
          
          // Fondos
          fondo: '#F5F5F7',           // Fondo general - Gris premium (Apple/Notion style)
          fondoCard: '#FFFFFF',        // Fondo tarjetas - Blanco puro
          fondoAlterno: '#FAFAFA',     // Fondo alterno - Filas alternadas
          fondoHover: '#F1F1F1',       // Fondo hover - Filas y elementos
          
          // Textos
          texto: '#1E1E1E',           // Gris oscuro - Textos serios
          textoMedio: '#6B6B6B',      // Gris medio - Subtítulos
          textoClaro: '#E1E1E1',      // Gris claro - Líneas y separadores
          
          // Bordes
          borde: '#E6E6E6',            // Borde suave - Tarjetas
          bordeInput: '#E1E1E1',      // Borde inputs
          bordeHover: '#EC4899',      // Borde hover inputs - Rosa
          
          // Botones
          btnHover: 'rgba(220, 38, 38, 0.15)',  // Hover botón primario - Rojo transparente más intenso
          btnActive: 'rgba(220, 38, 38, 0.2)',   // Estado activo botón primario - Rojo transparente más intenso
          
          // Acciones
          editar: '#F59E0B',          // Ámbar - Editar
          eliminar: '#DC2626',        // Rojo - Eliminar
          
          // Estados
          exito: '#2E8B57',            // Verde profesional - Éxito
          advertencia: '#E6B800',      // Amarillo cálido - Advertencia
          error: '#DC2626',            // Rojo - Error
          info: '#3878D9',             // Azul suave - Información
        },
      },
      fontFamily: {
        // Tipografías Arnald DataFlow
        heading: ['Montserrat', 'sans-serif'],      // Titulares (H1, H2, H3)
        body: ['Inter', 'sans-serif'],              // Contenido general
        accent: ['Poppins', 'sans-serif'],          // Acentos y números
      },
      borderRadius: {
        'fenix': '6px',  // Bordes redondeados según guía
      },
    },
  },
  plugins: [],
}

