# Intune Policy Description Generator

A local tool that fetches all Microsoft Intune policies from a tenant and automatically generates meaningful descriptions using Azure OpenAI. Generated descriptions can be written back to Intune directly.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Supported Policy Types](#supported-policy-types)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [Running the Application](#running-the-application)
8. [Usage](#usage)
9. [API Reference](#api-reference)
10. [Project Structure](#project-structure)
11. [Troubleshooting](#troubleshooting)
12. [Security Notes](#security-notes)

---

## Overview

Many Intune policies have no or inadequate descriptions. This tool solves that problem:

1. **Fetch** - Loads all policies from the Intune tenant via Microsoft Graph API (Beta)
2. **Analyze** - Sends the complete policy configuration (JSON) to Azure OpenAI
3. **Generate** - Creates structured, human-readable descriptions per policy
4. **Compare** - Shows a before/after view (original vs. generated description)
5. **Write Back** - Pushes selected descriptions directly back to Intune

<!-- SCREENSHOT: Login screen with "Sign in with Microsoft" button -->
<!-- Filename: screenshot_01_login.png -->

---

## Architecture

```
+------------------+         +------------------+         +---------------------+
|                  |  HTTP   |                  |  HTTPS  |                     |
|  React Frontend  | ------> |  FastAPI Backend  | ------> |  Microsoft Graph    |
|  (Vite, Port     |         |  (uvicorn, Port  |         |  API (Beta)         |
|   5173)          |         |   8099)          |         |                     |
|                  |         |                  |         +---------------------+
+------------------+         |                  |
                             |                  |  HTTPS  +---------------------+
                             |                  | ------> |  Azure OpenAI       |
                             |                  |         |  (GPT-5-mini)       |
                             +------------------+         +---------------------+
                                    |
                                    | MSAL
                                    v
                             +------------------+
                             |  Azure AD /       |
                             |  Entra ID         |
                             +------------------+
```

### Frontend (React + TypeScript + Vite + Tailwind CSS)

- Single-page application with glassmorphism design
- Communicates with backend via `/api/*` proxy
- Components:
  - `PolicyList` - Table of all policies with search, filter, multi-select
  - `SettingsPanel` - LLM settings (system prompt, template, custom instructions)
  - `GenerationProgress` - Progress bar during generation
  - `DescriptionResult` - Before/after comparison with Intune update functionality

### Backend (Python + FastAPI)

- REST API with asynchronous processing
- MSAL-based authentication (interactive browser login)
- Microsoft Graph API client with automatic token renewal and pagination
- Azure OpenAI integration for description generation
- LLM settings persisted locally in `llm_settings.json`

---

## Supported Policy Types

| Policy Type | Graph API Endpoint | Read | Write |
|---|---|---|---|
| Device Configuration | `/deviceManagement/deviceConfigurations` | Yes | Yes |
| Settings Catalog | `/deviceManagement/configurationPolicies` | Yes (incl. settings) | Yes |
| Compliance Policy | `/deviceManagement/deviceCompliancePolicies` | Yes | Yes |
| App Protection | `/deviceAppManagement/managedAppPolicies` | Yes | Yes |
| Conditional Access | `/identity/conditionalAccess/policies` | Yes | No |
| Endpoint Security | `/deviceManagement/intents` | Yes (incl. categories) | Yes |
| App Configuration | `/deviceAppManagement/mobileAppConfigurations` | Yes | Yes |
| Autopilot | `/deviceManagement/windowsAutopilotDeploymentProfiles` | Yes | No |
| Device Enrollment | `/deviceManagement/deviceEnrollmentConfigurations` | Yes | No |
| Remediation Script | `/deviceManagement/deviceHealthScripts` | Yes | No |
| PowerShell Script | `/deviceManagement/deviceManagementScripts` | Yes | No |
| Group Policy (ADMX) | `/deviceManagement/groupPolicyConfigurations` | Yes (incl. definition values) | Yes |

> **Note:** "Write" means the description value can be updated via the Graph API using PATCH. Not all policy types support this.

---

## Prerequisites

### System

- **Python 3.11 - 3.13** (Python 3.14 is currently not supported due to pydantic-core build issues)
- **Node.js 18+** with npm
- **Azure CLI** (`az`) installed and available in PATH
- **Web browser** for interactive Microsoft login

### Azure

- **Azure tenant** with Microsoft Intune license
- **Azure OpenAI Service** with a deployment (e.g. `gpt-5-mini`)
  - Endpoint URL
  - API Key
  - Deployment name

### Permissions

The application uses the Microsoft Graph PowerShell app registration (Client ID: `14d82eec-204b-4c2f-b7e8-296a70dab67e`), which is pre-consented for Graph APIs. The following scopes are requested:

| Scope | Purpose |
|---|---|
| `DeviceManagementConfiguration.Read.All` | Read device configurations, settings catalog, endpoint security |
| `DeviceManagementConfiguration.ReadWrite.All` | Write descriptions back to Intune |
| `DeviceManagementManagedDevices.Read.All` | Read device-related policies |
| `DeviceManagementApps.Read.All` | Read app protection/configuration policies |
| `DeviceManagementServiceConfig.Read.All` | Read enrollment configurations |
| `Policy.Read.All` | Read conditional access policies |

> The signed-in user must have these permissions in the tenant (or an admin must consent them).

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/JayRHa/Intune-Policy-Description-Generator.git
cd Intune-Policy-Description-Generator
```

### 2. Set up the backend

```bash
cd backend

# Create virtual environment (Python 3.13 recommended)
python3.13 -m venv venv
source venv/bin/activate   # macOS/Linux
# venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt
pip install msal
```

**requirements.txt includes:**

| Package | Version | Purpose |
|---|---|---|
| fastapi | 0.115.6 | Web framework |
| uvicorn | 0.34.0 | ASGI server |
| httpx | 0.28.1 | Async HTTP client for Graph API |
| openai | 1.58.1 | Azure OpenAI SDK |
| pydantic | 2.10.4 | Data validation |
| pydantic-settings | 2.7.1 | Environment-based settings |
| python-dotenv | 1.0.1 | Load .env files |

### 3. Set up the frontend

```bash
cd frontend
npm install
```

---

## Configuration

### Azure OpenAI Credentials

Create a `.env` file in the `backend/` directory:

```bash
cp .env.example backend/.env
```

Edit `backend/.env`:

```env
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-5-mini
AZURE_OPENAI_API_VERSION=2025-04-01-preview
```

> **Important:** The `.env` file must not be committed to Git. It is already included in `.gitignore`.

### LLM Settings (optional)

LLM settings (system prompt, template, custom instructions) can be adjusted via the web interface. They are stored in `backend/llm_settings.json` and persist across restarts.

**Default System Prompt:**

> You are an expert Microsoft Intune administrator. Your task is to analyze Intune policy configurations and generate clear, concise descriptions...

**Default Template:**

```
## {policy_name}

**Type:** {policy_type}
**Platform:** {platform}

### Description
{description}
```

---

## Running the Application

### Option A: Manual (recommended for development)

**Terminal 1 - Backend:**

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8099
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

### Option B: Start script

```bash
# Note: adjust port in start.sh if needed (default: 8000)
chmod +x start.sh
./start.sh
```

> **Note:** Make sure port 8099 is not in use. For port conflicts (e.g. with OrbStack on port 8000), change the port in the `uvicorn` command and in `frontend/vite.config.ts`.

### Ports

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8099 |
| API Docs (Swagger) | http://localhost:8099/docs |

---

## Usage

### Step 1: Azure CLI Login

Before starting the application, sign in with Azure CLI:

```bash
az login
```

The tenant is automatically detected from `az account show`.

### Step 2: Microsoft Graph Login

Open http://localhost:5173 in your browser. You will see the login screen.

<!-- SCREENSHOT: Login screen with glassmorphism design and "Sign in with Microsoft" button -->
<!-- Filename: screenshot_01_login.png -->
<!-- Description: Shows the initial login screen with lock icon and sign-in button -->

Click **"Sign in with Microsoft"**. A browser window opens for interactive authentication. Select your account and accept the permissions.

### Step 3: Load Policies

After successful login, you will see the main view. Click **"Load Policies"** in the top right corner.

<!-- SCREENSHOT: Main view after login, before loading policies -->
<!-- Filename: screenshot_02_main_empty.png -->
<!-- Description: Header with "Load Policies" button, empty content area -->

Policies are loaded from all 12 policy types in parallel. A spinner indicates the loading process.

<!-- SCREENSHOT: Loaded policy list with all policies -->
<!-- Filename: screenshot_03_policy_list.png -->
<!-- Description: Table with policies, search field, type filter dropdown, columns: Checkbox, Name, Type, Platform, Description -->

### Step 4: Select Policies

- **Individual:** Click on a row in the table to select/deselect it
- **All:** Use the **"Select All"** button
- **Search:** Use the search field to filter by policy name or description
- **Type filter:** Filter by policy type via the dropdown (e.g. only "Settings Catalog")

<!-- SCREENSHOT: Policy list with several selected policies (blue highlight) -->
<!-- Filename: screenshot_04_policies_selected.png -->
<!-- Description: Multiple policies highlighted in blue, header shows "X policies found, Y selected" -->

### Step 5: Adjust LLM Settings (optional)

Click the **gear icon** in the top right corner to open the settings.

<!-- SCREENSHOT: Settings panel / modal with system prompt, template and custom instructions -->
<!-- Filename: screenshot_05_settings.png -->
<!-- Description: Modal dialog with three textareas: System Prompt, Output Template, Custom Instructions -->

You can configure:

| Setting | Description |
|---|---|
| **System Prompt** | Defines the role and rules for the LLM |
| **Output Template** | Format template for the generated description |
| **Custom Instructions** | Additional instructions appended to the system prompt |

Click **"Save"** to persist the settings. They are stored locally in `backend/llm_settings.json`.

### Step 6: Generate Descriptions

Click **"Generate (N)"** in the header. Generation starts and displays a progress bar.

<!-- SCREENSHOT: Generation progress bar -->
<!-- Filename: screenshot_06_generating.png -->
<!-- Description: Centered progress bar with "Generating description for: [Policy-Name]", current counter (e.g. 3/12) -->

For each selected policy:

1. The complete policy configuration is loaded from the Graph API
2. The configuration is sent as JSON to Azure OpenAI
3. A description is generated based on the system prompt and template

### Step 7: Review Results (Before/After)

After generation, you see the results view with a before/after comparison:

<!-- SCREENSHOT: Results view with before/after columns -->
<!-- Filename: screenshot_07_results_before_after.png -->
<!-- Description: Per policy a card with: header (checkbox, name, type badge), two columns: left "Original Description" (gray, read-only), right "Generated Description" (editable textarea) -->

**Features in the results view:**

| Action | Description |
|---|---|
| **Before/After** | Left shows the current Intune description, right shows the generated one |
| **Edit** | The generated description can be edited directly in the textarea |
| **Select** | Click on a card to mark the policy for Intune update (blue border) |
| **Select All / Deselect All** | Select or deselect all policies at once |
| **Export** | Export all descriptions as a Markdown file |

### Step 8: Write Descriptions to Intune

1. Select the policies you want to update in Intune (click on the card or "Select All")
2. Click **"Sync to Intune (N)"**
3. Successfully updated policies receive a green **"Updated in Intune"** badge

<!-- SCREENSHOT: Results view with some "Updated in Intune" badges -->
<!-- Filename: screenshot_08_updated_policies.png -->
<!-- Description: Some policy cards have green border and a green "Updated in Intune" badge with checkmark. The update button shows the remaining count. -->

> **Note:** Not all policy types support write-back (see table above). Policies without write support will show an error message.

---

## API Reference

All endpoints are available at `http://localhost:8099/api/`. Interactive documentation at `http://localhost:8099/docs`.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/status` | Check auth status (local cache only, no network) |
| `POST` | `/api/auth/login` | Start interactive browser login |

**GET /api/auth/status - Response:**

```json
{
  "authenticated": true,
  "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "user": "admin@contoso.onmicrosoft.com"
}
```

### Policies

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/policies` | Load all policies (12 types in parallel) |
| `GET` | `/api/policies/{type}/{id}` | Policy details with type-specific settings |
| `GET` | `/api/policy-types` | Available policy types and labels |

**GET /api/policies - Response:**

```json
{
  "policies": [
    {
      "id": "abc-123",
      "display_name": "Windows - Antivirus",
      "description": "...",
      "policy_type": "endpointSecurity",
      "platform": "Windows"
    }
  ]
}
```

### Generation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/generate-single` | Generate description for a single policy |

**POST /api/generate-single - Request:**

```json
{
  "policy_id": "abc-123",
  "policy_type": "deviceConfiguration",
  "system_prompt": "Optional: Custom system prompt",
  "template": "Optional: Custom template",
  "custom_instructions": "Optional: Extra instructions"
}
```

**Response:**

```json
{
  "policy_id": "abc-123",
  "policy_name": "Windows - Antivirus",
  "policy_type": "deviceConfiguration",
  "generated_description": "This policy configures..."
}
```

### Update Descriptions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/update-descriptions` | Update policy descriptions in Intune (bulk) |

**POST /api/update-descriptions - Request:**

```json
{
  "updates": [
    {
      "policy_id": "abc-123",
      "policy_type": "deviceConfiguration",
      "description": "New description..."
    }
  ]
}
```

**Response:**

```json
{
  "results": [
    { "policy_id": "abc-123", "policy_type": "deviceConfiguration", "status": "updated" }
  ],
  "errors": [
    { "policy_id": "def-456", "policy_type": "conditionalAccess", "error": "Policy type does not support..." }
  ]
}
```

### LLM Settings

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/settings` | Load current LLM settings |
| `PUT` | `/api/settings` | Save LLM settings |

---

## Project Structure

```
IntunePolicy/
|
|-- backend/
|   |-- main.py                 # FastAPI app, CORS, all API endpoints
|   |-- auth.py                 # MSAL authentication, token cache
|   |-- graph_client.py         # Async HTTP client for Microsoft Graph API
|   |-- policy_fetcher.py       # Policy types, fetching, details, update
|   |-- llm_service.py          # Azure OpenAI integration
|   |-- models.py               # Pydantic models (Policy, GenerationResult, etc.)
|   |-- config.py               # Environment-based settings
|   |-- requirements.txt        # Python dependencies
|   |-- llm_settings.json       # Persisted LLM settings (generated at runtime)
|   |-- .token_cache.json       # MSAL token cache (generated, do not commit!)
|   +-- venv/                   # Python virtual environment
|
|-- frontend/
|   |-- index.html              # HTML entry point
|   |-- package.json            # Node.js dependencies
|   |-- vite.config.ts          # Vite config with API proxy
|   |-- tailwind.config.js      # Tailwind CSS configuration
|   |-- tsconfig.json           # TypeScript configuration
|   +-- src/
|       |-- main.tsx            # React entry point
|       |-- App.tsx             # Main component (routing, state)
|       |-- index.css           # Global styles, glassmorphism
|       |-- api/
|       |   +-- client.ts       # API client (fetch-based)
|       |-- types/
|       |   +-- index.ts        # TypeScript interfaces, labels
|       +-- components/
|           |-- PolicyList.tsx       # Policy table with filter & search
|           |-- PolicyDetail.tsx     # Policy detail view
|           |-- SettingsPanel.tsx    # LLM settings modal
|           |-- GenerationProgress.tsx # Progress indicator
|           +-- DescriptionResult.tsx  # Before/after + update
|
|-- .env.example                # Template for Azure OpenAI credentials
|-- .gitignore                  # Git ignore rules
+-- start.sh                    # Start script for both servers
```

### File Details

#### `backend/auth.py`
- Uses the Microsoft Graph PowerShell app registration (pre-consented)
- Token is stored in a local file cache (`.token_cache.json`)
- `check_auth()` only checks the local cache (fast, no network calls)
- `get_graph_token()` tries silent login first, then interactive browser login
- Tenant ID is detected via `az account show` and cached

#### `backend/graph_client.py`
- Singleton `GraphClient` with connection pooling via `httpx.AsyncClient`
- Automatic token renewal on 401 responses
- `get_all()` automatically follows `@odata.nextLink` for pagination
- `patch()` for description updates, handles 204 No Content

#### `backend/policy_fetcher.py`
- 12 policy types defined in `POLICY_ENDPOINTS`
- `fetch_all_policies()` loads all types in parallel via `asyncio.gather()`
- `fetch_policy_details()` loads type-specific additional data:
  - Settings Catalog: `/{id}/settings`
  - Endpoint Security: `/{id}/categories` with their settings
  - Group Policy: `/{id}/definitionValues`
- `update_policy_description()` handles PATCH including `@odata.type` for device configurations
- `PATCHABLE_TYPES` defines which types support write-back

#### `backend/llm_service.py`
- Creates a new `AsyncAzureOpenAI` client per request
- Uses `max_completion_tokens=1000` (not `max_tokens`, which is unsupported by newer models)
- No `temperature` configuration (gpt-5-mini only supports the default value)
- Custom instructions are appended to the system prompt

#### `frontend/src/App.tsx`
- Three views: `policies` | `generating` | `results`
- Generation runs sequentially (one policy at a time) for progress tracking
- Original description is attached to results from the loaded policy list

#### `frontend/src/components/DescriptionResult.tsx`
- Two-column layout: original (read-only) vs. generated (editable)
- Per-policy selection for selective Intune update
- Tracks successfully updated policies ("Updated in Intune" badge)
- Markdown export of all descriptions

---

## Troubleshooting

### "Not Authenticated" even though I'm logged in

The token cache may have expired. Click "Sign in with Microsoft" again - a browser window will open for authentication.

### 403 Forbidden when fetching policies

The signed-in user does not have the required Intune permissions. Make sure the user has at least the "Intune Administrator" role or equivalent permissions.

### Port conflicts

If port 8099 or 5173 is already in use:

**Change backend port:**
```bash
uvicorn main:app --reload --port NEW_PORT
```

Also update the proxy in `frontend/vite.config.ts`:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:NEW_PORT',
  },
},
```

### "max_tokens is not supported"

This issue has already been resolved. The tool uses `max_completion_tokens` instead of `max_tokens`. If the error still occurs, check that `llm_service.py` is up to date.

### PATCH errors for Device Configurations

Device Configuration policies require `@odata.type` in the PATCH body. The tool automatically reads this value from the existing policy. If the error persists, the policy may be read-only.

### Python 3.14 build errors

`pydantic-core` cannot be compiled under Python 3.14. Use Python 3.11 - 3.13:
```bash
python3.13 -m venv venv
```

### White screen / React errors

Open the browser console (F12 > Console) and check for JavaScript errors. Common cause: the backend is not reachable. Make sure both servers are running.

---

## Security Notes

- **Azure OpenAI credentials** must be configured exclusively via `.env` file or environment variables. Never hardcode them in source files.
- **Token cache** (`.token_cache.json`) contains refresh tokens and must not be committed to Git.
- The application uses the **Graph API Beta** - this can change without notice.
- **ReadWrite permissions**: The application requests `DeviceManagementConfiguration.ReadWrite.All` to write descriptions back. This permission theoretically allows other changes - the application exclusively uses it for description updates via PATCH.
- The application runs **locally** and only sends data to Microsoft Graph and Azure OpenAI. No data is transmitted to third parties.

---

## Screenshots

For complete documentation, the following screenshots are needed. See `docs/screenshots/SCREENSHOTS.md` for details on how to capture them.

| # | Filename | Description |
|---|----------|-------------|
| 1 | `screenshot_01_login.png` | Login screen with "Sign in with Microsoft" button |
| 2 | `screenshot_02_main_empty.png` | Main view after login, before loading policies |
| 3 | `screenshot_03_policy_list.png` | Loaded policy list with search field and filter |
| 4 | `screenshot_04_policies_selected.png` | Policy list with selected policies |
| 5 | `screenshot_05_settings.png` | Settings modal with system prompt, template, custom instructions |
| 6 | `screenshot_06_generating.png` | Progress bar during generation |
| 7 | `screenshot_07_results_before_after.png` | Results view with before/after columns |
| 8 | `screenshot_08_updated_policies.png` | Policies with "Updated in Intune" badge |

> Place screenshots in `docs/screenshots/` and replace the HTML comment placeholders in this README with `![Description](docs/screenshots/filename.png)`.
