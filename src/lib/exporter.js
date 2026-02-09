/**
 * Export service - handles the site archive export using b2c CLI
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

/**
 * Checks if dw.json exists in the current directory or parent directories
 * @returns {{exists: boolean, path: string|null}} Object with exists flag and path if found
 */
export function checkDwJsonExists() {
	let currentDir = process.cwd();
	const root = path.parse(currentDir).root;

	while (currentDir !== root) {
		const dwJsonPath = path.join(currentDir, "dw.json");
		if (fs.existsSync(dwJsonPath)) {
			return { exists: true, path: dwJsonPath };
		}
		currentDir = path.dirname(currentDir);
	}

	// Also check for environment variables as alternative
	const hasEnvConfig = process.env.SFCC_SERVER || process.env.SFCC_CLIENT_ID;

	return {
		exists: hasEnvConfig,
		path: hasEnvConfig ? "environment variables" : null,
	};
}

/**
 * Gets available instances from dw.json (for multi-instance configurations)
 * @returns {{instances: Array<{name: string, hostname: string, active: boolean}>|null, path: string|null}}
 */
export function getAvailableInstances() {
	const dwJsonCheck = checkDwJsonExists();
	if (!dwJsonCheck.exists || dwJsonCheck.path === "environment variables") {
		return { instances: null, path: dwJsonCheck.path };
	}

	try {
		const dwJsonContent = fs.readFileSync(dwJsonCheck.path, "utf-8");
		const dwJson = JSON.parse(dwJsonContent);

		// Check for multi-instance configuration (configs array)
		if (dwJson.configs && Array.isArray(dwJson.configs)) {
			const instances = dwJson.configs.map((config) => ({
				name: config.name || "unnamed",
				hostname: config.hostname || config.server || "unknown",
				active: config.active === true,
			}));
			return { instances, path: dwJsonCheck.path };
		}

		// Single instance configuration - return null to indicate no multi-instance
		return { instances: null, path: dwJsonCheck.path };
	} catch {
		return { instances: null, path: dwJsonCheck.path };
	}
}

/**
 * Tests connectivity to the SFCC instance using b2c setup config
 * @param {object} options - Options including debug flag and instance name
 * @returns {Promise<{success: boolean, hostname: string|null, error: string|null}>}
 */
export async function testInstanceConnectivity(options = {}) {
	try {
		const result = await executeB2cCommand(["setup", "config"], options);

		if (result.code === 0) {
			const output = JSON.parse(result.stdout);
			const config = output.config || output;

			if (config.hostname) {
				return {
					success: true,
					hostname: config.hostname,
					error: null,
				};
			}
		}

		// Try to parse error message
		let errorMessage = "Unable to read instance configuration";
		if (result.stderr) {
			errorMessage = result.stderr.trim();
		}

		return {
			success: false,
			hostname: null,
			error: errorMessage,
		};
	} catch (error) {
		return {
			success: false,
			hostname: null,
			error: error.message,
		};
	}
}

/**
 * Checks if b2c CLI is installed and available
 * @returns {Promise<boolean>} True if b2c CLI is available
 */
export async function checkB2cCli() {
	return new Promise((resolve) => {
		const child = spawn("b2c", ["--version"], {
			shell: true,
			stdio: "pipe",
		});

		child.on("close", (code) => {
			resolve(code === 0);
		});

		child.on("error", () => {
			resolve(false);
		});
	});
}

/**
 * Executes a b2c CLI command
 * @param {string[]} args - Command arguments
 * @param {object} options - Execution options
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export function executeB2cCommand(args, options = {}) {
	return new Promise((resolve, reject) => {
		const { debug = false, cwd = process.cwd(), instance = null } = options;

		// Build full args array
		const fullArgs = [...args];

		if (instance) {
			fullArgs.push("--instance", instance);
		}

		// Debug mode enables trace-level logging for network traffic
		if (debug) {
			fullArgs.push("--log-level", "trace");
		}

		// Always output JSON for parsing
		fullArgs.push("--json");

		if (debug) {
			// Don't print the full JSON for data-units
			const printArgs = fullArgs.map((arg, i) => {
				if (fullArgs[i - 1] === "--data-units" && arg.startsWith("{")) {
					return "{...}";
				}
				return arg;
			});
			console.log(chalk.gray(`\n> b2c ${printArgs.join(" ")}\n`));
		}

		// Use shell: false to avoid escaping issues with JSON
		// Find the b2c executable path
		const b2cPath = process.platform === "win32" ? "b2c.cmd" : "b2c";

		const child = spawn(b2cPath, fullArgs, {
			shell: false,
			cwd,
			stdio: "pipe",
			env: { ...process.env },
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (data) => {
			stdout += data.toString();
			if (debug) {
				process.stdout.write(data);
			}
		});

		child.stderr.on("data", (data) => {
			stderr += data.toString();
			if (debug) {
				process.stderr.write(data);
			}
		});

		child.on("close", (code) => {
			resolve({ stdout, stderr, code });
		});

		child.on("error", (err) => {
			reject(err);
		});
	});
}

/**
 * Builds the export command arguments from data units configuration
 * @param {object} dataUnits - The data units configuration
 * @param {object} exportOptions - Export options
 * @returns {string[]} Command arguments
 */
export function buildExportArgs(dataUnits, exportOptions = {}) {
	const args = ["job", "export"];
	const {
		outputPath = "./exports",
		keepArchive = false,
		timeout = 600,
	} = exportOptions;

	// Output directory
	args.push("--output", path.resolve(outputPath));

	// Timeout
	args.push("--timeout", timeout.toString());

	// Keep archive flag
	if (keepArchive) {
		args.push("--keep-archive");
	}

	// Always download as zip (no extraction)
	args.push("--zip-only");

	// Build arguments using individual flags instead of --data-units JSON
	// This provides better compatibility with different SFCC instance versions

	// Global data
	if (dataUnits.global_data && Object.keys(dataUnits.global_data).length > 0) {
		const enabledGlobalData = Object.entries(dataUnits.global_data)
			.filter(([_, enabled]) => enabled === true)
			.map(([key]) => key);
		if (enabledGlobalData.length > 0) {
			args.push("--global-data", enabledGlobalData.join(","));
		}
	}

	// Sites
	if (dataUnits.sites && Object.keys(dataUnits.sites).length > 0) {
		const siteIds = Object.keys(dataUnits.sites);
		args.push("--site", siteIds.join(","));

		// Collect all enabled site data units across all sites
		const allSiteData = new Set();
		for (const siteConfig of Object.values(dataUnits.sites)) {
			if (typeof siteConfig === "object") {
				for (const [key, enabled] of Object.entries(siteConfig)) {
					if (enabled === true) {
						allSiteData.add(key);
					}
				}
			}
		}
		if (allSiteData.size > 0) {
			args.push("--site-data", [...allSiteData].join(","));
		}
	}

	// Inventory lists
	if (
		dataUnits.inventory_lists &&
		Object.keys(dataUnits.inventory_lists).length > 0
	) {
		const inventoryIds = Object.entries(dataUnits.inventory_lists)
			.filter(([_, enabled]) => enabled === true)
			.map(([id]) => id);
		if (inventoryIds.length > 0) {
			args.push("--inventory-list", inventoryIds.join(","));
		}
	}

	return args;
}

/**
 * Executes the site archive export using b2c CLI
 * @param {object} dataUnits - The data units configuration
 * @param {object} options - Export options
 * @returns {Promise<object>} Export result
 */
export async function executeSiteExport(dataUnits, options = {}) {
	const {
		outputPath = "./exports",
		keepArchive = false,
		timeout = 600,
		debug = false,
		instance = null,
	} = options;

	// Check if b2c CLI is available
	const cliAvailable = await checkB2cCli();
	if (!cliAvailable) {
		throw new Error(
			"b2c CLI is not installed or not in PATH.\n" +
				"Please install it with: npm install -g @salesforce/b2c-cli\n" +
				"See: https://salesforcecommercecloud.github.io/b2c-developer-tooling/guide/installation.html",
		);
	}

	// Ensure output directory exists
	const absoluteOutputPath = path.resolve(outputPath);
	if (!fs.existsSync(absoluteOutputPath)) {
		fs.mkdirSync(absoluteOutputPath, { recursive: true });
	}

	// Build export arguments
	const args = buildExportArgs(dataUnits, {
		outputPath: absoluteOutputPath,
		keepArchive,
		timeout,
	});

	// Execute the command
	const result = await executeB2cCommand(args, {
		debug,
		instance,
	});

	if (result.code !== 0) {
		// Try to parse error from JSON output (may be multiline JSON logs)
		let errorMessage = "Export failed";
		const fullOutput = result.stdout || result.stderr || "";

		// Check for JobAlreadyRunningException in the output
		if (fullOutput.includes("JobAlreadyRunningException")) {
			throw new Error(
				"The export job is already running on this instance.\n" +
					"Please wait for the current job to complete and try again.\n" +
					"You can check job status in Business Manager: Administration > Operations > Jobs",
			);
		}

		// Try to extract error message from JSON log lines
		try {
			// b2c-cli outputs newline-delimited JSON logs
			const lines = fullOutput.split("\n").filter((l) => l.trim());
			for (const line of lines) {
				try {
					const logEntry = JSON.parse(line);
					// Look for error level messages or error objects
					if (logEntry.level === "error" && logEntry.msg) {
						errorMessage = logEntry.msg;
						break;
					}
					if (logEntry.error?.message) {
						errorMessage = logEntry.error.message;
						break;
					}
				} catch {
					// Not valid JSON, continue
				}
			}
		} catch {
			// Use raw output if parsing fails completely
			errorMessage = fullOutput || "Export failed with unknown error";
		}
		throw new Error(errorMessage);
	}

	// Parse the result
	try {
		const output = JSON.parse(result.stdout);
		return {
			success: true,
			localPath: output.localPath || output.path,
			archiveFilename: output.archiveFilename || output.archive,
			...output,
		};
	} catch {
		// Return basic success if JSON parsing fails
		return {
			success: true,
			localPath: absoluteOutputPath,
		};
	}
}

/**
 * Gets instance configuration info from b2c setup config
 * @param {object} options - Options including instance name
 * @returns {Promise<object>} Instance info
 */
export async function getInstanceInfo(options = {}) {
	const args = ["setup", "config"];

	try {
		const result = await executeB2cCommand(args, options);

		if (result.code === 0) {
			const output = JSON.parse(result.stdout);
			// The config is nested under 'config' key
			const config = output.config || output;
			return {
				hostname: config.hostname || config.server || "unknown",
				codeVersion: config.codeVersion || config["code-version"],
			};
		}
	} catch {
		// Ignore errors
	}

	return {
		hostname: "configured instance",
		codeVersion: null,
	};
}

/**
 * Executes a site archive import using b2c CLI
 * @param {string} archivePath - Path to the archive file to import
 * @param {object} options - Import options
 * @returns {Promise<object>} Import result
 */
export async function executeSiteImport(archivePath, options = {}) {
	const {
		timeout = 600,
		debug = false,
		instance = null,
		keepArchive = false,
	} = options;

	// Check if archive exists
	if (!fs.existsSync(archivePath)) {
		throw new Error(`Archive file not found: ${archivePath}`);
	}

	// Build import arguments
	const args = ["job", "import", archivePath];

	// Timeout
	args.push("--timeout", timeout.toString());

	// Keep archive flag
	if (keepArchive) {
		args.push("--keep-archive");
	}

	// Execute the command
	const result = await executeB2cCommand(args, {
		debug,
		instance,
	});

	if (result.code !== 0) {
		// Try to parse error from JSON output
		let errorMessage = "Import failed";
		try {
			const output = JSON.parse(result.stdout || result.stderr);
			if (output.error) {
				errorMessage = output.error.message || output.error;
			} else if (output.message) {
				errorMessage = output.message;
			}
		} catch {
			// Use stderr if JSON parsing fails
			errorMessage =
				result.stderr || result.stdout || "Import failed with unknown error";
		}
		throw new Error(errorMessage);
	}

	// Parse the result
	try {
		const output = JSON.parse(result.stdout);
		return {
			success: true,
			...output,
		};
	} catch {
		// Return basic success if JSON parsing fails
		return {
			success: true,
		};
	}
}
