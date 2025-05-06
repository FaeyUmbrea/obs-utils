# OBS Utils Development Guidelines

This document provides essential information for developers working on the OBS Utils module for Foundry VTT.

## Build and Configuration Instructions

### Prerequisites

- Node.js (^18.12.1)
- Yarn (^4.5.0)
- A running Foundry VTT instance for testing

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```

### Build Commands

- **Development Build with Watch Mode**:
  ```bash
  yarn watch
  ```
  This will build the module and watch for changes, rebuilding automatically when files are modified.

- **Production Build**:
  ```bash
  yarn build
  ```
  This creates optimized production files in the `dist` directory.

- **Development Server**:
  ```bash
  yarn dev
  ```
  Starts a development server on port 30001 that proxies to a Foundry VTT instance running on port 30000.

### Linking to Foundry VTT

To link the module to your local Foundry VTT installation for testing:
```bash
yarn linkFoundry
```

This script will create a symbolic link from your Foundry VTT data directory to the module directory.

### Build Configuration

The build process uses Vite with the following configuration:

- Source code is in the `src/` directory
- Built files go to the `dist/` directory
- ES2022 is targeted for compatibility
- Svelte is used for UI components

## Testing Information

### Test Environment Setup

The project uses Playwright for end-to-end testing. Tests require a running Foundry VTT instance with specific user accounts:
- Gamemaster (for GM tests)
- Player2 (for OBS tests)
- Player3 (for player tests)

### Running Tests

To run all tests:
```bash
yarn test
```

This will execute the Playwright tests defined in the `tests` directory.

### Test Structure

Tests are organized in the `tests` directory:
- `fixtures.js`: Contains test fixtures and setup code
- `*.spec.js`: Test files containing the actual test cases
- `initScripts/`: Contains initialization scripts for the test environment

### Creating New Tests

1. Create a new test file in the `tests` directory with a `.spec.js` extension
2. Import the test fixtures:
   ```javascript
   import { expect, test } from './fixtures.js';
   ```
3. Write your test using the provided fixtures:
   ```javascript
   test('Test description', async ({ pages: { gmPage, obsPage, playerPage } }) => {
     // Test code here
     // gmPage - Gamemaster browser context
     // obsPage - OBS browser context (with fake OBS environment)
     // playerPage - Player browser context
   });
   ```

### Example Test

Here's a simple example test that checks if the OBS Utils module is loaded:

```javascript
import { expect, test } from './fixtures.js';

test('Check if OBS Utils module is loaded', async ({ pages: { gmPage } }) => {
  // Wait for the game to be ready
  await gmPage.waitForFunction(() => window.game.ready);
  
  // Check if the OBS Utils module is registered in the game modules
  const isModuleLoaded = await gmPage.evaluate(() => {
    return game.modules.get('obs-utils')?.active === true;
  });
  
  // Assert that the module is loaded and active
  expect(isModuleLoaded).toBeTruthy();
});
```

### Test Coverage

The test configuration includes code coverage reporting using monocart-reporter. Coverage reports are generated in the `test-results` directory.

## Development Guidelines

### Code Style

The project uses ESLint with the @antfu/eslint-config configuration. Key style rules include:

- Use tabs for indentation
- Use single quotes for strings
- Use semicolons at the end of statements
- Follow the 1TBS brace style (with allowance for single-line blocks)

To lint your code:
```bash
yarn lint
```

To automatically fix linting issues:
```bash
yarn lint:fix
```

### Project Structure

- `src/`: Source code
  - `index.ts`: Main entry point
  - `applications/`: Application classes
  - `svelte/components/`: Svelte UI components
  - `utils/`: Utility functions
- `dist/`: Built files (generated)
- `lang/`: Language files for internationalization
- `tests/`: Test files

### Internationalization

The module supports multiple languages. Language files are stored in the `lang/` directory. To add or modify translations, edit the corresponding JSON files.

The project uses Weblate for translation management: https://hosted.weblate.org/engage/obs-utils/

### OBS Integration

The module integrates with OBS Studio using the OBS WebSocket protocol. The integration code is in `src/applications/obsremote.ts` and `src/utils/obs.ts`.

When developing features that interact with OBS, test both with and without an actual OBS connection to ensure graceful fallbacks.

## Troubleshooting

### Common Issues

1. **OBS Browser Source Compatibility**: OBS Studio's browser source uses Chrome 103, which may have compatibility issues with newer JavaScript features. Test in both OBS and a modern browser.

2. **Foundry VTT Version Compatibility**: The module is designed for Foundry VTT versions 11-12. Ensure you're testing with a compatible version.

3. **Test Environment**: If tests fail, ensure your Foundry VTT instance is running on port 30000 and has the required user accounts.
