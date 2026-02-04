/**
 * Export command handler
 */

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import {
	filterEnabledDataUnits,
	generateArchiveName,
	loadConfig,
	printExportSummary,
} from "../lib/config.js";
import {
	checkB2cCli,
	checkDwJsonExists,
	executeSiteExport,
	getInstanceInfo,
	testInstanceConnectivity,
} from "../lib/exporter.js";
import {
	displayInteractiveSummary,
	runInteractivePrompts,
} from "../lib/interactive.js";

/**
 * Build data units from interactive config format
 * @param {object} config - Interactive config
 * @returns {object} Data units in the expected format
 */
function buildDataUnitsFromInteractiveConfig(config) {
	const dataUnits = {
		global_data: config.global_data || {},
		sites: config.sites || {},
	};

	if (config.inventory_lists)
		dataUnits.inventory_lists = config.inventory_lists;

	return dataUnits;
}

/**
 * Export command action
 * @param {object} options - Command options
 */
export async function exportCommand(options) {
	const spinner = ora();

	try {
		console.log(chalk.bold.blue("\n🚀 SFCC Site Exporter\n"));

		// Validate that either config or interactive mode is specified
		if (!options.interactive && !options.config) {
			console.log(
				chalk.red(
					"❌ Error: You must specify either a config file (-c) or use interactive mode (-i)",
				),
			);
			console.log(chalk.gray("\n   Examples:"));
			console.log(
				chalk.gray("     sfcc-site-exporter export -c ./export-config.json"),
			);
			console.log(chalk.gray("     sfcc-site-exporter export -i"));
			process.exit(1);
		}

		// Step 1: Check if b2c CLI is available
		spinner.start("Checking b2c CLI...");
		const cliAvailable = await checkB2cCli();
		if (!cliAvailable) {
			spinner.fail("b2c CLI not found");
			console.log(chalk.red("\n❌ The b2c CLI is required but not installed."));
			console.log(
				chalk.gray("   Install it with: npm install -g @salesforce/b2c-cli"),
			);
			console.log(
				chalk.gray(
					"   See: https://salesforcecommercecloud.github.io/b2c-developer-tooling/guide/installation.html\n",
				),
			);
			process.exit(1);
		}
		spinner.succeed("b2c CLI found");

		// Step 2: Check if dw.json exists or environment variables are set
		spinner.start("Checking instance configuration (dw.json)...");
		const dwJsonCheck = checkDwJsonExists();
		if (!dwJsonCheck.exists) {
			spinner.fail("No instance configuration found");
			console.log(
				chalk.red("\n❌ No dw.json file or environment variables found."),
			);
			console.log(
				chalk.gray("\n   Create a dw.json file in your project root:"),
			);
			console.log(chalk.gray("   {"));
			console.log(
				chalk.gray(
					'     "hostname": "your-instance.dx.commercecloud.salesforce.com",',
				),
			);
			console.log(chalk.gray('     "client-id": "your-client-id",'));
			console.log(chalk.gray('     "client-secret": "your-client-secret",'));
			console.log(chalk.gray("   }"));
			console.log(
				chalk.gray(
					"\n   Or set environment variables: SFCC_SERVER, SFCC_CLIENT_ID, etc.\n",
				),
			);
			process.exit(1);
		}
		spinner.succeed(
			`Instance configuration found: ${chalk.cyan(dwJsonCheck.path)}`,
		);

		// Step 3: Test connectivity to the SFCC instance
		spinner.start("Testing connectivity to SFCC instance...");
		const connectivityTest = await testInstanceConnectivity({
			debug: options.debug,
		});
		if (!connectivityTest.success) {
			spinner.fail("Failed to connect to SFCC instance");
			console.log(chalk.red(`\n❌ Could not connect to the SFCC instance.`));
			if (connectivityTest.error) {
				console.log(chalk.gray(`   Error: ${connectivityTest.error}`));
			}
			console.log(chalk.gray("\n   Please verify:"));
			console.log(chalk.gray("   - Your hostname is correct"));
			console.log(
				chalk.gray("   - Your client-id and client-secret are valid"),
			);
			console.log(chalk.gray("   - Your network can reach the instance"));
			console.log(chalk.gray("   - Run with -d flag for debug output\n"));
			process.exit(1);
		}
		spinner.succeed(`Connected to: ${chalk.cyan(connectivityTest.hostname)}`);

		let config;
		let dataUnits;
		let outputPath;
		let keepArchive;

		// Interactive mode or config file mode
		if (options.interactive) {
			// Run interactive prompts
			config = await runInteractivePrompts();

			// Display summary
			displayInteractiveSummary(config);

			// Build data units from interactive config
			dataUnits = buildDataUnitsFromInteractiveConfig(config);

			// Use output from interactive config or options
			outputPath = path.resolve(config.output_directory || options.output);
			keepArchive = config.keep_archive || options.keepArchive;

			// Save config if requested
			if (config._saveToFile && config._saveFilePath) {
				const saveConfig = { ...config };
				delete saveConfig._saveToFile;
				delete saveConfig._saveFilePath;
				fs.writeFileSync(
					config._saveFilePath,
					JSON.stringify(saveConfig, null, 2),
				);
				console.log(
					chalk.green(`✔ Configuration saved to ${config._saveFilePath}`),
				);
			}
		} else {
			// Load configuration from file
			spinner.start("Loading export configuration...");
			const loadedConfig = loadConfig(options.config);
			spinner.succeed(
				`Configuration loaded from ${chalk.cyan(options.config)}`,
			);

			// Filter enabled data units
			dataUnits = filterEnabledDataUnits(loadedConfig.dataUnits);
			outputPath = path.resolve(options.output);
			keepArchive = options.keepArchive;
			config = loadedConfig;
		}

		if (Object.keys(dataUnits).length === 0) {
			console.log(chalk.yellow("\n⚠️  No data units are enabled for export."));
			if (!options.interactive) {
				console.log(
					chalk.gray(
						`   Edit ${options.config} to enable the data you want to export.`,
					),
				);
				console.log(
					chalk.gray(
						`   Or run with --interactive flag to select interactively.\n`,
					),
				);
			}
			process.exit(1);
		}

		// Print export summary (only for non-interactive, as interactive already shows it)
		if (!options.interactive) {
			printExportSummary(dataUnits);
		}

		// Get instance info
		spinner.start("Checking SFCC instance configuration...");
		const instanceOptions = {};
		if (options.instance) {
			instanceOptions.instance = options.instance;
		}
		instanceOptions.debug = options.debug;

		const instanceInfo = await getInstanceInfo(instanceOptions);
		spinner.succeed(`Instance: ${chalk.cyan(instanceInfo.hostname)}`);

		// Generate archive name if template is provided
		const archiveTemplate =
			config.archive?.name || config.archive_name_template;
		if (archiveTemplate) {
			const archiveName = generateArchiveName(archiveTemplate);
			console.log(chalk.gray(`   Archive name template: ${archiveName}`));
		}

		console.log(chalk.gray(`   Output directory: ${outputPath}`));

		// Execute export
		const exportOptions = {
			outputPath,
			keepArchive,
			zipOnly: options.zipOnly,
			noDownload: !options.download, // Note: commander inverts --no-* flags
			timeout: options.timeout,
			debug: options.debug,
			instance: options.instance,
		};

		spinner.start("Starting site export job (this may take a while)...");
		console.log("");

		const startTime = Date.now();
		const result = await executeSiteExport(dataUnits, exportOptions);
		const duration = ((Date.now() - startTime) / 1000).toFixed(1);

		spinner.succeed(`Export completed in ${duration}s`);

		// Print result
		if (result.localPath) {
			console.log(
				chalk.green(`\n✅ Export saved to: ${chalk.bold(result.localPath)}`),
			);
		} else if (result.archiveFilename) {
			console.log(
				chalk.green(
					`\n✅ Export archive created: ${chalk.bold(result.archiveFilename)}`,
				),
			);
			if (options.keepArchive) {
				console.log(
					chalk.gray(
						`   Archive kept on instance at: Impex/src/instance/${result.archiveFilename}`,
					),
				);
			}
		}

		console.log("");
	} catch (error) {
		spinner.fail("Export failed");
		console.error(chalk.red(`\n❌ Error: ${error.message}`));

		if (options.debug) {
			console.error(chalk.gray("\nStack trace:"));
			console.error(chalk.gray(error.stack));
		}

		process.exit(1);
	}
}
