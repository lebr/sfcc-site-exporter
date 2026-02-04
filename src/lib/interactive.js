/**
 * Interactive CLI prompts for SFCC Site Exporter
 */

import { checkbox, confirm, input } from "@inquirer/prompts";
import chalk from "chalk";
import { globalDataOptions, siteDataOptions } from "./config.js";
import { executeB2cCommand } from "./exporter.js";

/**
 * Descriptions for global data units
 */
const GLOBAL_DATA_DESCRIPTIONS = {
	access_roles: "User access roles and permissions",
	all: "Export all global data",
	csc_settings: "Customer Service Center settings",
	csrf_whitelists: "CSRF whitelist configurations",
	custom_preference_groups: "Custom preference group definitions",
	custom_quota_settings: "Custom quota configurations",
	custom_types: "Custom object type definitions",
	geolocations: "Geolocation data",
	global_custom_objects: "Global custom object instances",
	job_schedules: "Job schedule configurations",
	job_schedules_deprecated: "Deprecated job schedules",
	locales: "Locale configurations",
	meta_data: "System and custom object metadata",
	oauth_providers: "OAuth provider configurations",
	ocapi_settings: "Global OCAPI settings",
	page_meta_tags: "Page meta tag definitions",
	preferences: "Global system preferences",
	price_adjustment_limits: "Price adjustment limit settings",
	services: "Service configurations",
	sorting_rules: "Global sorting rules",
	static_resources: "Static resource files",
	system_type_definitions: "System type definitions",
	users: "Business Manager users",
	webdav_client_permissions: "WebDAV client permission settings",
};

/**
 * Descriptions for site data units
 */
const SITE_DATA_DESCRIPTIONS = {
	all: "Export all site data",
	ab_tests: "A/B test configurations",
	active_data_feeds: "Active data feed configurations",
	cache_settings: "Page cache settings",
	campaigns_and_promotions: "Campaigns and promotion definitions",
	content: "Content assets and folders",
	coupons: "Coupon definitions",
	custom_objects: "Site-specific custom objects",
	customer_cdn_settings: "Customer CDN configurations",
	customer_groups: "Customer group definitions",
	distributed_commerce_extensions: "Distributed commerce extensions",
	dynamic_file_resources: "Dynamic file resources",
	gift_certificates: "Gift certificate configurations",
	ocapi_settings: "Site-specific OCAPI settings",
	payment_methods: "Payment method configurations",
	payment_processors: "Payment processor configurations",
	redirect_urls: "URL redirect rules",
	search_settings: "Search configuration settings",
	shipping: "Shipping method configurations",
	site_descriptor: "Site descriptor settings",
	site_preferences: "Site preference values",
	sitemap_settings: "Sitemap configurations",
	slots: "Content slot configurations",
	sorting_rules: "Product sorting rules",
	source_codes: "Source code definitions",
	static_dynamic_alias_mappings: "Static/dynamic alias mappings",
	stores: "Store locator data",
	tax: "Tax configurations",
	url_rules: "URL rewrite rules",
};

/**
 * Fetches available sites from the SFCC instance
 * @returns {Promise<string[]>} Array of site IDs
 */
async function fetchAvailableSites() {
	try {
		const result = await executeB2cCommand(["sites", "list"], {});
		if (result.code === 0) {
			const sites = JSON.parse(result.stdout);
			if (sites?.data && Array.isArray(sites.data)) {
				return sites.data.map((s) => s.id || s.siteId || s);
			}
		}
	} catch {
		// Failed to fetch sites
	}
	return null;
}

/**
 * Runs the interactive export configuration wizard
 * @returns {Promise<object>} Export configuration object
 */
export async function runInteractivePrompts() {
	console.log(chalk.cyan("\n📋 Interactive Export Configuration\n"));

	// Step 1: Global Data Selection
	console.log(chalk.yellow("Step 1: Global Data"));
	console.log(
		chalk.gray("Select global data units to export (affects all sites)\n"),
	);

	const globalDataChoices = globalDataOptions
		.filter((key) => key !== "all") // Exclude 'all' for more granular control
		.map((key) => ({
			name: `${key} ${chalk.gray(`- ${GLOBAL_DATA_DESCRIPTIONS[key] || ""}`)}`,
			value: key,
		}));

	const selectedGlobalData = await checkbox({
		message: "Select global data units:",
		choices: globalDataChoices,
		pageSize: 15,
		loop: false,
	});

	// Step 2: Sites Selection
	console.log(chalk.yellow("\nStep 2: Sites"));

	// Try to fetch available sites
	const fetchSites = await confirm({
		message: "Would you like to fetch available sites from the instance?",
		default: true,
	});

	let availableSites = null;
	if (fetchSites) {
		console.log(chalk.gray("Fetching sites from instance..."));
		availableSites = await fetchAvailableSites();
		if (availableSites && availableSites.length > 0) {
			console.log(chalk.green(`Found ${availableSites.length} sites\n`));
		} else {
			console.log(
				chalk.yellow("Could not fetch sites. You can enter them manually.\n"),
			);
		}
	}

	let selectedSites = [];

	if (availableSites && availableSites.length > 0) {
		selectedSites = await checkbox({
			message: "Select sites to export:",
			choices: availableSites.map((site) => ({ name: site, value: site })),
			pageSize: 15,
			loop: false,
		});
	} else {
		const sitesInput = await input({
			message: "Enter site IDs (comma-separated):",
			validate: (value) =>
				value.trim().length > 0 ? true : "Please enter at least one site ID",
		});
		selectedSites = sitesInput
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
	}

	// Step 3: Site Data Selection
	const siteDataConfig = {};

	if (selectedSites.length > 0) {
		console.log(chalk.yellow("\nStep 3: Site Data Units"));

		const sameDataForAll =
			selectedSites.length > 1
				? await confirm({
						message: "Use the same data units for all sites?",
						default: true,
					})
				: true;

		const siteDataChoices = siteDataOptions
			.filter((key) => key !== "all") // Exclude 'all' for more granular control
			.map((key) => ({
				name: `${key} ${chalk.gray(`- ${SITE_DATA_DESCRIPTIONS[key] || ""}`)}`,
				value: key,
			}));

		if (sameDataForAll) {
			console.log(chalk.gray("\nSelect data units to export for all sites:\n"));
			const selectedSiteData = await checkbox({
				message: "Site data units:",
				choices: siteDataChoices,
				pageSize: 15,
				loop: false,
			});

			// Apply same selection to all sites
			for (const site of selectedSites) {
				siteDataConfig[site] = selectedSiteData;
			}
		} else {
			// Configure each site individually
			for (const site of selectedSites) {
				console.log(chalk.cyan(`\nConfiguring site: ${site}`));
				const selectedSiteData = await checkbox({
					message: `Data units for ${site}:`,
					choices: siteDataChoices,
					pageSize: 15,
					loop: false,
				});
				siteDataConfig[site] = selectedSiteData;
			}
		}
	}

	// Step 4: Output Options
	console.log(chalk.yellow("\nStep 4: Output Options"));

	const outputDir = await input({
		message: "Output directory:",
		default: "./exports",
	});

	const archiveNameTemplate = await input({
		message: "Archive name template:",
		default: "export-{date}-{timestamp}",
	});

	const keepArchive = await confirm({
		message: "Keep archive on instance after download?",
		default: false,
	});

	// Build config object
	const config = {
		output_directory: outputDir,
		archive_name_template: archiveNameTemplate,
		keep_archive: keepArchive,
		global_data: {},
		sites: {},
	};

	// Set global data
	for (const unit of selectedGlobalData) {
		config.global_data[unit] = true;
	}

	// Set sites data
	for (const [site, dataUnits] of Object.entries(siteDataConfig)) {
		config.sites[site] = {};
		for (const unit of dataUnits) {
			config.sites[site][unit] = true;
		}
	}

	// Ask to save config
	const saveConfig = await confirm({
		message: "Save this configuration to a file for future use?",
		default: false,
	});

	if (saveConfig) {
		config._saveToFile = true;
		config._saveFilePath = await input({
			message: "Config file path:",
			default: "./export-config.json",
		});
	}

	return config;
}

/**
 * Displays a summary of the interactive configuration
 * @param {object} config - The configuration object
 */
export function displayInteractiveSummary(config) {
	console.log(chalk.cyan("\n📦 Export Configuration Summary:\n"));

	const globalUnits = Object.keys(config.global_data || {}).filter(
		(k) => config.global_data[k],
	);
	if (globalUnits.length > 0) {
		console.log(chalk.white("  Global Data:"));
		for (const unit of globalUnits) {
			console.log(chalk.gray(`    - ${unit}`));
		}
	}

	const sites = Object.keys(config.sites || {});
	if (sites.length > 0) {
		console.log(chalk.white("\n  Sites:"));
		for (const site of sites) {
			console.log(chalk.cyan(`    ${site}:`));
			const siteUnits = Object.keys(config.sites[site]).filter(
				(k) => config.sites[site][k],
			);
			for (const unit of siteUnits) {
				console.log(chalk.gray(`      - ${unit}`));
			}
		}
	}

	if (config.inventory_lists?.length) {
		console.log(
			chalk.white("  Inventory Lists:"),
			config.inventory_lists.join(", "),
		);
	}

	console.log("");
}
