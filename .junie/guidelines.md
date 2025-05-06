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

The project uses two testing frameworks:

1. **Vitest** for unit testing individual components
2. **Playwright** for end-to-end testing and testing components that interact with FoundryVTT

### Unit Testing with Vitest

Unit tests should be written for all components where possible, starting with the most fine-grained components first, then testing components that are composed from those. This ensures a solid foundation of well-tested building blocks.

**Important**: Due to licensing concerns, the FoundryVTT API should not be mocked. Components that interact with the FoundryVTT API must be tested using Playwright instead.

To run unit tests:

```bash
yarn test:unit
```

### End-to-End Testing with Playwright

The project uses Playwright for end-to-end testing and for testing components that interact with the FoundryVTT API. Tests require a running Foundry VTT instance with specific user accounts:

- Gamemaster (for GM tests)
- Player2 (for OBS tests)
- Player3 (for player tests)

To run Playwright tests:

```bash
yarn test:e2e
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

### Testing Best Practices

When writing tests for the project, follow these guidelines:

1. **Avoid Duplicate Test Coverage**: Tests should avoid testing parts of the code that are already covered by other tests, unless necessary due to a dependency between tested parts. This helps maintain a more efficient test suite and reduces redundancy.

2. **Test Smallest Components First**: Unit tests should be written for the smallest component first. This bottom-up approach ensures that the foundational components are solid before testing larger components that depend on them.

3. **Focus on Edge Cases**: Prioritize testing edge cases and boundary conditions that are likely to cause issues.

4. **Keep Tests Independent**: Each test should be able to run independently of others and should not rely on the state from previous tests.

5. **Use Vitest for Unit Testing**: Use Vitest for testing individual components and utilities that don't interact with the FoundryVTT API. This allows for faster, more focused tests.

6. **Don't Mock FoundryVTT API**: Due to licensing concerns, the FoundryVTT API should not be mocked in unit tests. Instead, use Playwright for testing components that interact with FoundryVTT.

7. **Browser Testing for FoundryVTT Integration**: Tests that interact with any part of FoundryVTT should be executed in the browser using Playwright to ensure the code integrates properly.

### Example Tests

#### Playwright Test Example

Here's a simple example of a Playwright test that checks if the OBS Utils module is loaded:

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

#### Vitest Unit Test Example

Here's an example of a Vitest unit test for utility functions that don't interact with the FoundryVTT API:

```typescript
import { describe, expect, it, vi } from 'vitest';
import { removeQuotes, sleep } from '../helpers';

describe('helpers.ts', () => {
	describe('sleep', () => {
		it('should resolve after the specified time', async () => {
			const delay = 100;

			// Use vi.useFakeTimers() to control time in tests
			vi.useFakeTimers();

			// Start the sleep promise but don't await it yet
			const promise = sleep(delay);

			// Fast-forward time by the delay amount
			vi.advanceTimersByTime(delay);

			// Now await the promise
			await promise;

			// Restore real timers
			vi.useRealTimers();
		});
	});

	describe('removeQuotes', () => {
		it('should remove double quotes from a string', () => {
			expect(removeQuotes('"hello"')).toBe('hello');
		});

		it('should return the original string if no quotes are present', () => {
			expect(removeQuotes('hello')).toBe('hello');
		});
	});
});
```

### Test Coverage

The project uses two testing frameworks:

1. **Vitest** for unit testing individual components
2. **Playwright** for end-to-end testing and testing components that interact with FoundryVTT

Both frameworks are configured to generate code coverage data in JSON format. After tests run, the coverage information is merged using istanbul-lib-coverage and processed into detailed reports using nyc.

#### Coverage Reports

Coverage reports are generated in the `test-results/coverage` directory with the following structure:

- `vitest/`: Coverage data from unit tests (JSON format)
- `playwright/`: Coverage data from end-to-end tests (JSON format)
- `merged/`: Combined coverage data from both test frameworks
  - `index.html`: Interactive HTML coverage report
  - `text-report.txt`: Text-based coverage summary

When developing new features or modifying existing code, check the HTML coverage report to identify areas that need improved test coverage. The report provides detailed information about statement, branch, function, and line coverage for each file in the project.

#### Running Coverage Reports

To generate coverage reports, run:

```bash
yarn test
```

This will run both unit and end-to-end tests, then merge the coverage data and generate the reports.

You can also run just the coverage merge process (if you've already run the tests):

```bash
yarn coverage:merge
```

## Development Guidelines

### Code Style

The project uses ESLint with the @antfu/eslint-config configuration. All codestyles should be taken from the eslint config. Linting the project before finalizing changes is mandatory.

Key style rules include:

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

### Dependencies

The project uses several dependencies that are important to understand:

- **@league-of-foundry-developers/foundry-vtt-types**: Contains community contributed type definitions for FoundryVTT, the runtime environment that this project lives in. It should be consulted to understand how certain aspects of foundry might work.

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
