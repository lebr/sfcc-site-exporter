/**
 * Validate command handler - validates a configuration file
 */

import chalk from "chalk";
import {
	filterEnabledDataUnits,
	loadConfig,
	printExportSummary,
} from "../lib/config.js";

/**
 * Validate command action
 * @param {object} options - Command options
 */
export async function validateCommand(options) {
	try {
		console.log(chalk.bold.blue("\n🔍 Validating Configuration\n"));

		// Load and validate configuration
		const config = loadConfig(options.config);
		console.log(
			chalk.green(
				`✅ Configuration file is valid: ${chalk.bold(options.config)}`,
			),
		);

		// Show what would be exported
		const dataUnits = filterEnabledDataUnits(config.dataUnits);

		if (Object.keys(dataUnits).length === 0) {
			console.log(
				chalk.yellow("\n⚠️  Warning: No data units are enabled for export."),
			);
			console.log(
				chalk.gray(
					"   Edit your configuration file to enable the data you want to export.\n",
				),
			);
		} else {
			printExportSummary(dataUnits);
			console.log(chalk.green("✅ Configuration is ready for export.\n"));
		}
	} catch (error) {
		console.error(chalk.red(`\n❌ Validation failed: ${error.message}\n`));
		process.exit(1);
	}
}
