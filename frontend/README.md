# Frontend Refactor - Echi di Aethel

## Overview

This document describes the refactored frontend architecture for the Echi di Aethel prototype. The refactor introduces a modern, modular, and maintainable codebase structure.

## Architecture

### JavaScript Modules

The frontend is now organized into modular JavaScript files:

- **`js/config.js`** - Centralized configuration for API endpoints, UI settings, and game constants
- **`js/api.js`** - API service module handling all backend communication
- **`js/ui.js`** - UI service module for DOM manipulation and user feedback
- **`js/state.js`** - State management for centralized data flow
- **`js/game.js`** - Game logic and business rules
- **`js/app.js`** - Main application coordinator

### CSS Architecture

The CSS is organized using a modular approach:

- **`css/variables.css`** - CSS custom properties (design system)
- **`css/base.css`** - Reset, typography, and foundational styles
- **`css/components.css`** - Reusable UI component styles
- **`css/layout.css`** - Layout utilities and grid systems
- **`css/main.css`** - Main stylesheet importing all modules

## Key Improvements

### 1. Modular JavaScript Architecture

- **Separation of Concerns**: Each module has a specific responsibility
- **Dependency Injection**: Services are injected into classes for better testability
- **Error Handling**: Comprehensive error handling throughout the application
- **State Management**: Centralized state with reactive updates

### 2. Modern CSS Architecture

- **CSS Custom Properties**: Centralized design system with CSS variables
- **Component-Based Styling**: Reusable component classes
- **Responsive Design**: Mobile-first approach with breakpoint utilities
- **Accessibility**: Focus states, reduced motion support, high contrast mode

### 3. Enhanced User Experience

- **Loading States**: Visual feedback during API calls
- **Form Validation**: Real-time validation with user feedback
- **Error Messages**: Clear, contextual error messages
- **Animations**: Smooth transitions and micro-interactions

### 4. Developer Experience

- **JSDoc Comments**: Comprehensive documentation for all functions
- **Type Safety**: TypeScript-like JSDoc annotations
- **Modular Structure**: Easy to maintain and extend
- **Configuration**: Centralized settings for easy customization

## File Structure

```
frontend/
├── css/
│   ├── variables.css      # Design system variables
│   ├── base.css          # Reset and typography
│   ├── components.css    # UI components
│   ├── layout.css        # Layout utilities
│   └── main.css          # Main stylesheet
├── js/
│   ├── config.js         # Configuration
│   ├── api.js           # API service
│   ├── ui.js            # UI service
│   ├── state.js         # State management
│   ├── game.js          # Game logic
│   └── app.js           # Main application
├── assets/              # Static assets
├── index.html           # Main HTML file
└── README.md           # This file
```

## Usage

### Configuration

All configuration is centralized in `js/config.js`:

```javascript
const CONFIG = {
    API: {
        BASE_URL: 'http://localhost:8088/api',
        TIMEOUT: 10000
    },
    UI: {
        MESSAGE_DISPLAY_DURATION: 5000,
        ANIMATION_DURATION: 300
    }
    // ... more configuration
};
```

### Adding New Features

1. **API Endpoints**: Add to `api.js` service
2. **UI Components**: Add styles to `components.css`
3. **Game Logic**: Add to `game.js` service
4. **State Management**: Use `stateManager` for data flow

### Styling Guidelines

- Use CSS custom properties from `variables.css`
- Follow the component-based approach
- Use utility classes from `layout.css`
- Maintain responsive design principles

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features with fallbacks
- CSS Grid and Flexbox
- CSS Custom Properties

## Performance

- Modular loading for better caching
- Optimized CSS with minimal redundancy
- Efficient DOM manipulation
- Lazy loading for non-critical resources

## Accessibility

- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Reduced motion preferences

## Future Enhancements

- TypeScript migration
- Component library
- Testing framework integration
- Build system (Webpack/Vite)
- PWA features
- Dark mode implementation
