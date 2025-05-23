import { devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config = {
	reporter: [
		['list'],
		[
			'monocart-reporter',
			{
				name: 'My Test Report',
				outputFile: './test-results/report.html',
				// global coverage report options
				coverage: {
					entryFilter: entry => entry.url.includes('obs-utils'),
					sourceFilter: sourcePath =>
						sourcePath.search(/src\/.+/) !== -1
						&& sourcePath.search('node_modules') === -1,
					outputDir: './test-results/coverage/playwright',
					reports: [
						['json'],
						['html'],
					],
				},
			},
		],
	],
	testDir: './tests',
	/* Maximum time one test can run for. */
	timeout: 45 * 1000,
	expect: {
		/**
		 * Maximum time expect() should wait for the condition to be met.
		 * For example in `await expect(locator).toHaveText();`
		 */
		timeout: 5000,
	},
	/* Run tests in files in parallel */
	fullyParallel: false,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	/* Opt out of parallel tests on CI. */
	workers: 1,
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
		actionTimeout: 0,
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: process.env.TEST_URL
			? process.env.TEST_URL
			: 'http://localhost:30001',

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry',
		launchOptions: {
			args: ['--use-gl=angle'],
		},
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: 'Desktop Chromium',
			use: {
				...devices['Desktop Chrome'],
				args: ['--use-gl=desktop'],
				viewport: {
					height: 1080,
					width: 1920,
				},
			},
		},

		/* Test against mobile viewports. */
		// {
		//   name: 'Mobile Chrome',
		//   use: {
		//     ...devices['Pixel 5'],
		//   },
		// },
		// {
		//   name: 'Mobile Safari',
		//   use: {
		//     ...devices['iPhone 12'],
		//   },
		// },

		/* Test against branded browsers. */
		// {
		//   name: 'Microsoft Edge',
		//   use: {
		//     channel: 'msedge',
		//   },
		// },
		// {
		//   name: 'Google Chrome',
		//   use: {
		//     channel: 'chrome',
		//   },
		// },
	],

	/* Folder for test artifacts such as screenshots, videos, traces, etc. */
	outputDir: 'test-results/playwright/',

	/* Run your local dev server before starting the tests */
	// webServer: {
	//   command: 'npm run start',
	//   port: 3000,
	// },
};

export default config;
