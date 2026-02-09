#!/usr/bin/env node

/**
 * SFCC Site Exporter CLI
 * A configurable CLI tool to export SFCC site data using b2c-developer-tooling
 */

import { Command } from "commander";
import { exportCommand } from "./commands/export.js";
import { initCommand } from "./commands/init.js";
import { validateCommand } from "./commands/validate.js";

const program = new Command();

program
	.name("sfcc-site-exporter")
	.description("CLI tool to export SFCC site data using @salesforce/b2c-cli")
	.version("1.0.0");

// Export command
program
	.command("export")
	.description("Export site data from an SFCC instance")
	.option(
		"-c, --config <path>",
		"Path to export configuration file indicating which data units to export",
		"./export-config.json",
	)
	.option(
		"-o, --output <path>",
		"Output directory for the exported archive",
		"./exports",
	)
	.option(
		"-i, --interactive",
		"Run in interactive mode - select what to export via prompts",
		false,
	)
	.option("-f, --from <instance>", "Instance name from dw.json to export from")
	.option(
		"-k, --keep-archive",
		"Keep archive on the SFCC instance after download",
		false,
	)
	.option(
		"-t, --to <instance>",
		"After export, import the archive to this instance (from dw.json)",
	)
	.option(
		"-T, --timeout <seconds>",
		"Timeout in seconds for the export job",
		"600",
	)
	.option(
		"-d, --debug",
		"Enable debug logging with network traffic details",
		false,
	)
	.action(exportCommand);

// Init command - creates a sample configuration file
program
	.command("init")
	.description("Create a sample export configuration file")
	.option(
		"-o, --output <path>",
		"Output path for the configuration file",
		"./export-config.json",
	)
	.option("-f, --full", "Generate a full configuration with all options", false)
	.action(initCommand);

// Validate command - validates a configuration file
program
	.command("validate")
	.description("Validate an export configuration file")
	.option(
		"-c, --config <path>",
		"Path to export configuration file",
		"./export-config.json",
	)
	.action(validateCommand);

// Parse command line arguments
program.parse();
