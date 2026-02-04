/**
 * Init command handler - creates a sample configuration file
 */

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { globalDataOptions, siteDataOptions } from "../lib/config.js";

/**
 * Minimal configuration for quick start
 */
const minimalConfig = {
	archive: {
		name: "export-{date}-{timestamp}",
	},
	dataUnits: {
		global_data: {
			meta_data: true,
			custom_types: true,
		},
		sites: {
			// Replace 'YourSiteId' with your actual site ID
			YourSiteId: {
				content: true,
				site_preferences: true,
				customer_groups: true,
			},
		},
	},
};

/**
 * Full configuration with all options documented
 */
function generateFullConfig() {
	// Build site data options object
	const siteDataConfig = {};
	for (const option of siteDataOptions) {
		siteDataConfig[option] = false;
	}

	// Build global data options object
	const globalDataConfig = {};
	for (const option of globalDataOptions) {
		globalDataConfig[option] = false;
	}

	return {
		// Archive configuration
		archive: {
			// Name template for the export archive
			// Available placeholders:
			//   {date}      - Current date (YYYY-MM-DD)
			//   {time}      - Current time (HH-MM-SS)
			//   {timestamp} - Unix timestamp
			//   {site}      - Site ID (if exporting single site)
			name: "export-{date}-{timestamp}",
		},

		// Data units to export
		dataUnits: {
			// Global data configuration
			// Set any option to true to export that data type
			global_data: globalDataConfig,

			// Sites to export
			// Key is the site ID, value can be:
			//   - true: export all site data
			//   - object: specific data types to export
			sites: {
				ExampleSite: siteDataConfig,
			},

			// Customer lists (list_id: true)
			customer_lists: {
				// 'my-customer-list': true,
			},

			// Inventory lists (list_id: true)
			inventory_lists: {
				// 'my-inventory': true,
			},
		},
	};
}

/**
 * Init command action
 * @param {object} options - Command options
 */
export async function initCommand(options) {
	const outputPath = path.resolve(options.output);

	// Check if file already exists
	if (fs.existsSync(outputPath)) {
		console.log(
			chalk.yellow(`\n⚠️  Configuration file already exists: ${outputPath}`),
		);
		console.log(
			chalk.gray(
				"   Use a different output path or delete the existing file.\n",
			),
		);
		process.exit(1);
	}

	// Generate configuration
	const config = options.full ? generateFullConfig() : minimalConfig;

	// Write configuration file
	try {
		const content = JSON.stringify(config, null, 2);
		fs.writeFileSync(outputPath, content, "utf8");

		console.log(
			chalk.green(
				`\n✅ Configuration file created: ${chalk.bold(outputPath)}\n`,
			),
		);

		if (options.full) {
			console.log(
				chalk.cyan(
					"   Full configuration with all options has been generated.",
				),
			);
			console.log(
				chalk.gray(
					"   Edit the file to enable the data types you want to export.\n",
				),
			);
		} else {
			console.log(chalk.cyan("   Minimal configuration has been generated."));
			console.log(chalk.gray("   Edit the file to:"));
			console.log(
				chalk.gray('   1. Replace "YourSiteId" with your actual site ID'),
			);
			console.log(chalk.gray("   2. Enable additional data types as needed"));
			console.log(
				chalk.gray("   3. Add customer lists, inventory lists, etc.\n"),
			);
			console.log(
				chalk.gray(
					`   Run ${chalk.cyan("sfcc-site-exporter init --full")} for a complete configuration template.\n`,
				),
			);
		}

		console.log(chalk.bold("Next steps:"));
		console.log(
			chalk.gray(
				"   1. Configure your SFCC instance in dw.json (or use environment variables)",
			),
		);
		console.log(
			chalk.gray(
				"   2. Edit the export configuration to specify what data to export",
			),
		);
		console.log(
			chalk.gray(
				`   3. Run ${chalk.cyan("sfcc-site-exporter export")} to start the export\n`,
			),
		);
	} catch (error) {
		console.error(
			chalk.red(`\n❌ Failed to create configuration file: ${error.message}\n`),
		);
		process.exit(1);
	}
}
