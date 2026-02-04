# SFCC Site Exporter

A configurable CLI tool to export SFCC (Salesforce Commerce Cloud) site data using the [b2c-cli](https://github.com/SalesforceCommerceCloud/b2c-developer-tooling/blob/main/packages/b2c-cli/README.md).

## Features

- 📦 **Configurable Exports** - Fine-grained control over what data to export via JSON configuration or interactively in your terminal
- 🔐 **Authentication** - Uses b2c-cli and standard dw.json authentication
- 📥 **WebDAV Download** - Automatically retrieves exported archives from the instance
- 🎯 **Multiple Data Types** - Export sites data and or global data
- 📝 **Archive Naming** - Customizable archive names with date/time placeholders

## Related documentation

- [Official SFCC Site Export Job Documentation](https://salesforcecommercecloud.github.io/b2c-dev-doc/docs/current/jobstepapi/html/index.html?target=jobstep.SiteExport.html)
- [b2c-developer-tooling CLI](https://github.com/SalesforceCommerceCloud/b2c-developer-tooling)

## Prerequisites

- Node.js >= 22.0.0
- **b2c CLI installed globally** (`npm install -g @salesforce/b2c-cli`)
- SFCC instance with:
  - OAuth API Client credentials (client ID & secret)
  - WebDAV access configured (client ID & secret)
  - Appropriate OCAPI permissions for job execution

## Installation

```bash
# Clone or navigate to the project
cd sfcc-site-exporter

# Install dependencies
npm install

# Optional: Link globally for CLI usage
npm link
```

## Configuration

### 1. SFCC Instance Configuration (`dw.json`)

Create a `dw.json` file in the project root (or use environment variables):

```json
{
  "hostname": "your-sandbox.dx.commercecloud.salesforce.com",
  "client-id": "your-oauth-client-id",
  "client-secret": "your-oauth-client-secret"
}
```

Alternatively, use environment variables:
```bash
export SFCC_SERVER=your-sandbox.dx.commercecloud.salesforce.com
export SFCC_CLIENT_ID=your-oauth-client-id
export SFCC_CLIENT_SECRET=your-oauth-client-secret
```

### 2. Export Configuration (`export-config.json`)

Create an export configuration to specify what data to export:

```bash
# Generate a minimal configuration
sfcc-site-exporter init

# Or generate a full configuration with all options
sfcc-site-exporter init --full
```

Example configuration:

```json
{
  "archive": {
    "name": "export-{date}-{timestamp}"
  },
  "dataUnits": {
    "global_data": {
      "meta_data": true,
      "custom_types": true
    },
    "sites": {
      "RefArch": {
        "content": true,
        "site_preferences": true,
        "customer_groups": true
      }
    }
  }
}
```

## Usage

### Commands

#### Export Site Data

```bash
# Interactive mode - select what to export via prompts
sfcc-site-exporter export --interactive
# or short form
sfcc-site-exporter export -i

# Using a config file
sfcc-site-exporter export --config ./export-config.json
# or short form
sfcc-site-exporter export -c ./export-config.json

# Custom output directory
sfcc-site-exporter export -c ./export-config.json --output ./my-exports

# Keep archive on instance after download
sfcc-site-exporter export -c ./export-config.json --keep-archive

# Download as zip without extracting
sfcc-site-exporter export -c ./export-config.json --zip-only

# Use specific instance from multi-instance dw.json
sfcc-site-exporter export -c ./export-config.json --instance staging

# Set timeout (in seconds)
sfcc-site-exporter export -c ./export-config.json --timeout 900

# Debug output for troubleshooting
sfcc-site-exporter export -c ./export-config.json --debug
```

#### Interactive Mode

The interactive mode (`--interactive` or `-i`) provides a guided wizard to select what to export:

1. **Global Data** - Select global data units (meta_data, custom_types, etc.)
2. **Sites** - Choose sites to export (can fetch from instance or enter manually)
3. **Site Data Units** - Select per-site data (preferences, customer_groups, etc.)
4. **Output Options** - Configure output directory and archive naming
5. **Save Configuration** - Optionally save your selections to a config file for reuse

```bash
sfcc-site-exporter export -i
```

#### Initialize Configuration

```bash
# Create minimal configuration
sfcc-site-exporter init

# Create full configuration with all options documented
sfcc-site-exporter init --full

# Specify output path
sfcc-site-exporter init --output ./configs/export.json
```

#### Validate Configuration

```bash
# Validate configuration file
sfcc-site-exporter validate

# Validate specific config
sfcc-site-exporter validate --config ./my-config.json
```

## Export Configuration Reference

### Archive Configuration

| Property | Description |
|----------|-------------|
| `archive.name` | Archive name template. Supports placeholders: `{date}`, `{time}`, `{timestamp}`, `{site}` |

### Data Units

#### Global Data (`global_data`)

| Property | Description |
|----------|-------------|
| `access_roles` | Access roles |
| `all` | Export all global data |
| `csc_settings` | Customer Service Center settings |
| `csrf_whitelists` | CSRF whitelists |
| `custom_preference_groups` | Custom preference groups |
| `custom_quota_settings` | Custom quota settings |
| `custom_types` | Custom object type definitions |
| `geolocations` | Geolocations |
| `global_custom_objects` | Global custom objects |
| `job_schedules` | Job schedules |
| `locales` | Locale configurations |
| `meta_data` | System and custom object metadata |
| `oauth_providers` | OAuth providers |
| `ocapi_settings` | OCAPI settings |
| `page_meta_tags` | Page meta tags |
| `preferences` | Global preferences |
| `price_adjustment_limits` | Price adjustment limits |
| `services` | Service configurations |
| `sorting_rules` | Sorting rules |
| `static_resources` | Static resources |
| `system_type_definitions` | System type definitions |
| `users` | Users |
| `webdav_client_permissions` | WebDAV client permissions |

#### Site Data (`sites`)

Each site is configured as a key-value pair where the key is the site ID:

| Property | Description |
|----------|-------------|
| `all` | Export all site data |
| `ab_tests` | A/B tests |
| `active_data_feeds` | Active data feeds |
| `cache_settings` | Cache settings |
| `campaigns_and_promotions` | Campaigns and promotions |
| `content` | Content assets and slots |
| `coupons` | Coupons |
| `custom_objects` | Site-level custom objects |
| `customer_cdn_settings` | Customer CDN settings |
| `customer_groups` | Customer groups |
| `distributed_commerce_extensions` | Distributed commerce extensions |
| `dynamic_file_resources` | Dynamic file resources |
| `gift_certificates` | Gift certificates |
| `ocapi_settings` | Site OCAPI settings |
| `payment_methods` | Payment methods |
| `payment_processors` | Payment processors |
| `redirect_urls` | Redirect URLs |
| `search_settings` | Search settings |
| `shipping` | Shipping configurations |
| `site_descriptor` | Site descriptor |
| `site_preferences` | Site preferences |
| `sitemap_settings` | Sitemap settings |
| `slots` | Content slots |
| `sorting_rules` | Sorting rules |
| `source_codes` | Source codes |
| `static_dynamic_alias_mappings` | Static/dynamic alias mappings |
| `stores` | Stores |
| `tax` | Tax configurations |
| `url_rules` | URL rules |

## OCAPI Permissions Required

Configure these resources in Business Manager under **Administration > Site Development > Open Commerce API Settings**.

### Data API Configuration

Select **Data API** type and add/update the configuration for your client ID:

```json
{
  "_v": "25.6",
  "clients": [
    {
      "client_id": "YOUR_CLIENT_ID_HERE",
      "resources": [
        {
          "resource_id": "/sites",
          "methods": ["get"],
          "read_attributes": "(**)",
          "write_attributes": "(**)"
        },
        {
          "resource_id": "/sites/*",
          "methods": ["get"],
          "read_attributes": "(**)",
          "write_attributes": "(**)"
        },
        {
          "resource_id": "/jobs/*/executions",
          "methods": ["post"],
          "read_attributes": "(**)",
          "write_attributes": "(**)"
        },
        {
          "resource_id": "/jobs/*/executions/*",
          "methods": ["get"],
          "read_attributes": "(**)",
          "write_attributes": "(**)"
        },
        {
          "resource_id": "/job_execution_search",
          "methods": ["post"],
          "read_attributes": "(**)",
          "write_attributes": "(**)"
        }
      ]
    }
  ]
}
```

### Resources Summary

| Resource | Methods | Purpose |
|----------|---------|---------|
| `/sites` | GET | List available sites (interactive mode) |
| `/sites/*` | GET | Get site details |
| `/jobs/*/executions` | POST | Execute export job |
| `/jobs/*/executions/*` | GET | Monitor job status |
| `/job_execution_search` | POST | Search job executions |

> **Note:** If you already have OCAPI configuration for this client, merge the `resources` array with your existing configuration rather than replacing it entirely.

## Authentication Setup

1. **Create an API Client** in Account Manager
2. **Configure OCAPI permissions** in Business Manager
3. **Set up WebDAV access** for file download

For detailed instructions, see the [b2c-developer-tooling Authentication Guide](https://salesforcecommercecloud.github.io/b2c-developer-tooling/guide/authentication.html).

## Examples

### Export metadata only

```json
{
  "dataUnits": {
    "global_data": {
      "meta_data": true,
      "custom_types": true,
      "system_type_definitions": true
    }
  }
}
```

### Export a single site with all data

```json
{
  "dataUnits": {
    "sites": {
      "MySite": {
        "all": true
      }
    }
  }
}
```

### Export multiple sites with different configurations

```json
{
  "dataUnits": {
    "sites": {
      "SiteA": {
        "content": true,
        "site_preferences": true
      },
      "SiteB": {
        "campaigns_and_promotions": true,
        "coupons": true
      }
    }
  }
}
```

### Full export (site + inventory)

```json
{
  "dataUnits": {
    "global_data": {
      "meta_data": true
    },
    "sites": {
      "RefArch": {
        "all": true
      }
    }
  }
}
```

## Troubleshooting

### "No B2C instance configuration found"

Ensure you have a valid `dw.json` file or environment variables configured with:
- `hostname` / `SFCC_SERVER`
- `client-id` / `SFCC_CLIENT_ID`
- `client-secret` / `SFCC_CLIENT_SECRET`

### "OAuth configuration is required"

Job execution requires OAuth authentication. Make sure both `client-id` and `client-secret` are configured.

### Export job fails

1. Check OCAPI permissions are configured correctly
2. Verify WebDAV access is enabled for your client ID
3. Use `--debug` flag for detailed error information
4. Check the job log in Business Manager

### Connection issues

1. Verify hostname is correct
2. Check network connectivity
3. Ensure your IP is whitelisted (if applicable)

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
