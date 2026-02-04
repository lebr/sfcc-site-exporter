/**
 * Configuration loader and validator
 * Handles loading and validating the export configuration file
 */

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

/**
 * Default configuration structure with all available options
 */
export const defaultConfig = {
	// Archive configuration
	archive: {
		// Name template for the export archive
		// Supports placeholders: {date}, {time}, {timestamp}, {site}
		name: "export-{date}-{timestamp}",
	},

	// Data units to export
	dataUnits: {
		// Global data configuration
		global_data: {
			access_roles: false,
			all: false,
			csc_settings: false,
			csrf_whitelists: false,
			custom_preference_groups: false,
			custom_quota_settings: false,
			custom_types: false,
			geolocations: false,
			global_custom_objects: false,
			job_schedules: false,
			job_schedules_deprecated: false,
			locales: false,
			meta_data: false,
			oauth_providers: false,
			ocapi_settings: false,
			page_meta_tags: false,
			preferences: false,
			price_adjustment_limits: false,
			services: false,
			sorting_rules: false,
			static_resources: false,
			system_type_definitions: false,
			users: false,
			webdav_client_permissions: false,
		},

		// Sites configuration - key is site ID, value is site export config or true for all
		sites: {
			// Example:
			// 'RefArch': {
			//   all: false,
			//   ab_tests: false,
			//   active_data_feeds: false,
			//   cache_settings: false,
			//   campaigns_and_promotions: false,
			//   content: true,
			//   coupons: false,
			//   custom_objects: false,
			//   customer_cdn_settings: false,
			//   customer_groups: false,
			//   distributed_commerce_extensions: false,
			//   dynamic_file_resources: false,
			//   gift_certificates: false,
			//   ocapi_settings: false,
			//   payment_methods: false,
			//   payment_processors: false,
			//   redirect_urls: false,
			//   search_settings: false,
			//   shipping: false,
			//   site_descriptor: false,
			//   site_preferences: true,
			//   sitemap_settings: false,
			//   slots: false,
			//   sorting_rules: false,
			//   source_codes: false,
			//   static_dynamic_alias_mappings: false,
			//   stores: false,
			//   tax: false,
			//   url_rules: false,
			// }
		},

		// Customer lists - key is list ID, value is boolean
		customer_lists: {
			// Example: 'my-customer-list': true
		},

		// Inventory lists - key is list ID, value is boolean
		inventory_lists: {
			// Example: 'my-inventory': true
		},
	},
};

/**
 * Site export data options
 */
export const siteDataOptions = [
	"all",
	"ab_tests",
	"active_data_feeds",
	"cache_settings",
	"campaigns_and_promotions",
	"content",
	"coupons",
	"custom_objects",
	"customer_cdn_settings",
	"customer_groups",
	"distributed_commerce_extensions",
	"dynamic_file_resources",
	"gift_certificates",
	"ocapi_settings",
	"payment_methods",
	"payment_processors",
	"redirect_urls",
	"search_settings",
	"shipping",
	"site_descriptor",
	"site_preferences",
	"sitemap_settings",
	"slots",
	"sorting_rules",
	"source_codes",
	"static_dynamic_alias_mappings",
	"stores",
	"tax",
	"url_rules",
];

/**
 * Global data options
 */
export const globalDataOptions = [
	"access_roles",
	"all",
	"csc_settings",
	"csrf_whitelists",
	"custom_preference_groups",
	"custom_quota_settings",
	"custom_types",
	"geolocations",
	"global_custom_objects",
	"job_schedules",
	"job_schedules_deprecated",
	"locales",
	"meta_data",
	"oauth_providers",
	"ocapi_settings",
	"page_meta_tags",
	"preferences",
	"price_adjustment_limits",
	"services",
	"sorting_rules",
	"static_resources",
	"system_type_definitions",
	"users",
	"webdav_client_permissions",
];

/**
 * Loads and validates the export configuration file
 * @param {string} configPath - Path to the configuration file
 * @returns {object} The loaded and validated configuration
 */
export function loadConfig(configPath) {
	const absolutePath = path.resolve(configPath);

	if (!fs.existsSync(absolutePath)) {
		throw new Error(`Configuration file not found: ${absolutePath}`);
	}

	try {
		const content = fs.readFileSync(absolutePath, "utf8");
		const config = JSON.parse(content);

		// Validate and return
		return validateConfig(config);
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new Error(`Invalid JSON in configuration file: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Validates the configuration structure
 * @param {object} config - The configuration object to validate
 * @returns {object} The validated configuration
 */
export function validateConfig(config) {
	const errors = [];

	// Must have dataUnits
	if (!config.dataUnits) {
		errors.push('Configuration must have a "dataUnits" property');
	} else {
		// Validate dataUnits structure
		const validDataUnitKeys = [
			"global_data",
			"sites",
			"customer_lists",
			"inventory_lists",
		];

		for (const key of Object.keys(config.dataUnits)) {
			if (!validDataUnitKeys.includes(key)) {
				errors.push(
					`Unknown dataUnits key: "${key}". Valid keys are: ${validDataUnitKeys.join(", ")}`,
				);
			}
		}

		// Validate global_data options
		if (config.dataUnits.global_data) {
			for (const key of Object.keys(config.dataUnits.global_data)) {
				if (!globalDataOptions.includes(key)) {
					errors.push(`Unknown global_data option: "${key}"`);
				}
			}
		}

		// Validate sites configuration
		if (config.dataUnits.sites) {
			for (const [siteId, siteConfig] of Object.entries(
				config.dataUnits.sites,
			)) {
				if (typeof siteConfig === "object" && siteConfig !== null) {
					for (const key of Object.keys(siteConfig)) {
						if (!siteDataOptions.includes(key)) {
							errors.push(
								`Unknown site data option for site "${siteId}": "${key}"`,
							);
						}
					}
				} else if (typeof siteConfig !== "boolean") {
					errors.push(
						`Invalid site configuration for "${siteId}": must be boolean or object`,
					);
				}
			}
		}
	}

	if (errors.length > 0) {
		throw new Error(
			`Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
		);
	}

	return config;
}

/**
 * Generates the archive name based on the template
 * @param {string} template - The name template
 * @param {object} context - Context for placeholder replacement
 * @returns {string} The generated archive name
 */
export function generateArchiveName(template, context = {}) {
	const now = new Date();
	const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
	const time = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
	const timestamp = now.getTime();

	const name = template
		.replace("{date}", date)
		.replace("{time}", time)
		.replace("{timestamp}", timestamp.toString())
		.replace("{site}", context.site || "all");

	return name;
}

/**
 * Filters out false values from the data units configuration
 * Only includes properties that are set to true or are non-empty objects
 * @param {object} dataUnits - The data units configuration
 * @returns {object} Filtered data units
 */
export function filterEnabledDataUnits(dataUnits) {
	const filtered = {};

	for (const [key, value] of Object.entries(dataUnits)) {
		if (typeof value === "boolean") {
			if (value) {
				filtered[key] = value;
			}
		} else if (typeof value === "object" && value !== null) {
			// Filter nested objects
			const filteredNested = {};
			let hasEnabled = false;

			for (const [nestedKey, nestedValue] of Object.entries(value)) {
				if (typeof nestedValue === "boolean") {
					if (nestedValue) {
						filteredNested[nestedKey] = nestedValue;
						hasEnabled = true;
					}
				} else if (typeof nestedValue === "object" && nestedValue !== null) {
					// For site configs, filter the site options
					const filteredSite = filterEnabledDataUnits(nestedValue);
					if (Object.keys(filteredSite).length > 0) {
						filteredNested[nestedKey] = filteredSite;
						hasEnabled = true;
					}
				}
			}

			if (hasEnabled) {
				filtered[key] = filteredNested;
			}
		}
	}

	return filtered;
}

/**
 * Prints a summary of what will be exported
 * @param {object} dataUnits - The filtered data units
 */
export function printExportSummary(dataUnits) {
	console.log(chalk.cyan("\n📦 Export Summary:\n"));

	// Global data
	if (dataUnits.global_data) {
		const globalItems = Object.keys(dataUnits.global_data);
		if (globalItems.length > 0) {
			console.log(chalk.yellow("  Global Data:"));
			globalItems.forEach((item) => console.log(`    - ${item}`));
		}
	}

	// Sites
	if (dataUnits.sites) {
		console.log(chalk.yellow("\n  Sites:"));
		for (const [siteId, siteConfig] of Object.entries(dataUnits.sites)) {
			console.log(`    ${chalk.green(siteId)}:`);
			if (typeof siteConfig === "object") {
				Object.keys(siteConfig).forEach((item) =>
					console.log(`      - ${item}`),
				);
			} else {
				console.log("      - all data");
			}
		}
	}

	// Customer lists
	if (dataUnits.customer_lists) {
		console.log(chalk.yellow("\n  Customer Lists:"));
		Object.keys(dataUnits.customer_lists).forEach((id) =>
			console.log(`    - ${id}`),
		);
	}

	// Inventory lists
	if (dataUnits.inventory_lists) {
		console.log(chalk.yellow("\n  Inventory Lists:"));
		Object.keys(dataUnits.inventory_lists).forEach((id) =>
			console.log(`    - ${id}`),
		);
	}

	console.log("");
}
