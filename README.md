# Intune Policy Description Generator

Ein lokales Tool, das alle Microsoft Intune Policies aus einem Tenant abruft und mithilfe von Azure OpenAI automatisch aussagekraftige Beschreibungen generiert. Die generierten Beschreibungen koennen direkt zurueck nach Intune geschrieben werden.

---

## Inhaltsverzeichnis

1. [Ueberblick](#ueberblick)
2. [Architektur](#architektur)
3. [Unterstuetzte Policy-Typen](#unterstuetzte-policy-typen)
4. [Voraussetzungen](#voraussetzungen)
5. [Installation](#installation)
6. [Konfiguration](#konfiguration)
7. [Anwendung starten](#anwendung-starten)
8. [Bedienung](#bedienung)
9. [API-Referenz](#api-referenz)
10. [Projektstruktur](#projektstruktur)
11. [Fehlerbehebung](#fehlerbehebung)
12. [Sicherheitshinweise](#sicherheitshinweise)

---

## Ueberblick

Viele Intune-Policies haben keine oder nur unzureichende Beschreibungen. Dieses Tool loest das Problem:

1. **Abrufen** - Laedt alle Policies aus dem Intune-Tenant via Microsoft Graph API (Beta)
2. **Analysieren** - Sendet die vollstaendige Policy-Konfiguration (JSON) an Azure OpenAI
3. **Generieren** - Erzeugt strukturierte, verstaendliche Beschreibungen pro Policy
4. **Vergleichen** - Zeigt Vorher/Nachher-Ansicht (Original vs. generierte Beschreibung)
5. **Zurueckschreiben** - Schreibt ausgewaehlte Beschreibungen direkt in Intune zurueck

<!-- SCREENSHOT: Login-Screen mit "Sign in with Microsoft" Button -->
<!-- Dateiname: screenshot_01_login.png -->

---

## Architektur

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

- Single-Page-Application mit Glassmorphism-Design
- Kommuniziert ueber `/api/*` Proxy mit dem Backend
- Komponenten:
  - `PolicyList` - Tabelle aller Policies mit Suche, Filter, Mehrfachauswahl
  - `SettingsPanel` - LLM-Einstellungen (System Prompt, Template, Custom Instructions)
  - `GenerationProgress` - Fortschrittsbalken waehrend der Generierung
  - `DescriptionResult` - Vorher/Nachher-Vergleich mit Intune-Update-Funktion

### Backend (Python + FastAPI)

- REST-API mit asynchroner Verarbeitung
- MSAL-basierte Authentifizierung (interaktiver Browser-Login)
- Microsoft Graph API Client mit automatischer Token-Erneuerung und Pagination
- Azure OpenAI Integration fuer die Beschreibungsgenerierung
- LLM-Settings werden lokal in `llm_settings.json` persistiert

---

## Unterstuetzte Policy-Typen

| Policy-Typ | Graph API Endpoint | Lesend | Schreibend |
|---|---|---|---|
| Device Configuration | `/deviceManagement/deviceConfigurations` | Ja | Ja |
| Settings Catalog | `/deviceManagement/configurationPolicies` | Ja (inkl. Settings) | Ja |
| Compliance Policy | `/deviceManagement/deviceCompliancePolicies` | Ja | Ja |
| App Protection | `/deviceAppManagement/managedAppPolicies` | Ja | Ja |
| Conditional Access | `/identity/conditionalAccess/policies` | Ja | Nein |
| Endpoint Security | `/deviceManagement/intents` | Ja (inkl. Categories) | Ja |
| App Configuration | `/deviceAppManagement/mobileAppConfigurations` | Ja | Ja |
| Autopilot | `/deviceManagement/windowsAutopilotDeploymentProfiles` | Ja | Nein |
| Device Enrollment | `/deviceManagement/deviceEnrollmentConfigurations` | Ja | Nein |
| Remediation Script | `/deviceManagement/deviceHealthScripts` | Ja | Nein |
| PowerShell Script | `/deviceManagement/deviceManagementScripts` | Ja | Nein |
| Group Policy (ADMX) | `/deviceManagement/groupPolicyConfigurations` | Ja (inkl. Definition Values) | Ja |

> **Hinweis:** "Schreibend" bedeutet, dass der Description-Wert ueber die Graph API per PATCH aktualisiert werden kann. Nicht alle Policy-Typen unterstuetzen das.

---

## Voraussetzungen

### System

- **Python 3.11 - 3.13** (Python 3.14 wird derzeit nicht unterstuetzt wegen pydantic-core Build-Problemen)
- **Node.js 18+** mit npm
- **Azure CLI** (`az`) installiert und im PATH
- **Webbrowser** fuer den interaktiven Microsoft-Login

### Azure

- **Azure-Tenant** mit Microsoft Intune Lizenz
- **Azure OpenAI Service** mit einem Deployment (z.B. `gpt-5-mini`)
  - Endpoint URL
  - API Key
  - Deployment Name

### Berechtigungen

Die Anwendung verwendet die Microsoft Graph PowerShell App Registration (Client ID: `14d82eec-204b-4c2f-b7e8-296a70dab67e`), die fuer Graph APIs vorregistriert ist. Folgende Scopes werden angefordert:

| Scope | Zweck |
|---|---|
| `DeviceManagementConfiguration.Read.All` | Lesen von Device Configurations, Settings Catalog, Endpoint Security |
| `DeviceManagementConfiguration.ReadWrite.All` | Beschreibungen in Intune zurueckschreiben |
| `DeviceManagementManagedDevices.Read.All` | Lesen von Geraete-bezogenen Policies |
| `DeviceManagementApps.Read.All` | Lesen von App Protection/Configuration Policies |
| `DeviceManagementServiceConfig.Read.All` | Lesen von Enrollment-Konfigurationen |
| `Policy.Read.All` | Lesen von Conditional Access Policies |

> Der angemeldete Benutzer muss diese Berechtigungen im Tenant haben (oder ein Admin muss sie consenten).

---

## Installation

### 1. Repository klonen

```bash
cd /pfad/zu/deinem/workspace
git clone <repo-url> IntunePolicy
cd IntunePolicy
```

### 2. Backend einrichten

```bash
cd backend

# Virtuelle Umgebung erstellen (Python 3.13 empfohlen)
python3.13 -m venv venv
source venv/bin/activate   # macOS/Linux
# venv\Scripts\activate    # Windows

# Abhaengigkeiten installieren
pip install -r requirements.txt
pip install msal            # MSAL wird zusaetzlich benoetigt
```

**requirements.txt beinhaltet:**

| Paket | Version | Zweck |
|---|---|---|
| fastapi | 0.115.6 | Web-Framework |
| uvicorn | 0.34.0 | ASGI Server |
| httpx | 0.28.1 | Async HTTP Client fuer Graph API |
| openai | 1.58.1 | Azure OpenAI SDK |
| pydantic | 2.10.4 | Datenvalidierung |
| pydantic-settings | 2.7.1 | Environment-basierte Settings |
| python-dotenv | 1.0.1 | .env Datei laden |

### 3. Frontend einrichten

```bash
cd frontend
npm install
```

---

## Konfiguration

### Azure OpenAI Credentials

Erstelle eine `.env`-Datei im `backend/`-Verzeichnis:

```bash
cp .env.example backend/.env
```

Bearbeite `backend/.env`:

```env
AZURE_OPENAI_ENDPOINT=https://dein-resource-name.openai.azure.com
AZURE_OPENAI_API_KEY=dein-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-5-mini
AZURE_OPENAI_API_VERSION=2025-04-01-preview
```

> **Wichtig:** Die `.env`-Datei darf nicht in Git eingecheckt werden. Sie ist bereits in `.gitignore` enthalten.

### LLM-Einstellungen (optional)

Die LLM-Einstellungen (System Prompt, Template, Custom Instructions) koennen ueber die Web-Oberflaeche angepasst werden. Sie werden in `backend/llm_settings.json` gespeichert und ueberleben Neustarts.

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

## Anwendung starten

### Option A: Manuell (empfohlen fuer Entwicklung)

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

### Option B: Start-Script

```bash
# Vorher: Port in start.sh ggf. anpassen (default: 8000)
chmod +x start.sh
./start.sh
```

> **Hinweis:** Stelle sicher, dass Port 8099 nicht belegt ist. Bei Port-Konflikten (z.B. mit OrbStack auf Port 8000) aendere den Port im `uvicorn`-Befehl und in `frontend/vite.config.ts`.

### Ports

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8099 |
| API Docs (Swagger) | http://localhost:8099/docs |

---

## Bedienung

### Schritt 1: Azure CLI Login

Bevor du die Anwendung startest, melde dich mit der Azure CLI an:

```bash
az login
```

Der Tenant wird automatisch aus `az account show` ermittelt.

### Schritt 2: Microsoft Graph Login

Oeffne http://localhost:5173 im Browser. Du siehst den Login-Screen.

<!-- SCREENSHOT: Login-Screen mit glasigem Design und "Sign in with Microsoft" Button -->
<!-- Dateiname: screenshot_01_login.png -->
<!-- Beschreibung: Zeigt den initialen Login-Bildschirm mit Schloss-Icon und Sign-in Button -->

Klicke auf **"Sign in with Microsoft"**. Ein Browser-Fenster oeffnet sich fuer die interaktive Anmeldung. Waehle dein Konto und akzeptiere die Berechtigungen.

### Schritt 3: Policies laden

Nach erfolgreicher Anmeldung siehst du die Hauptansicht. Klicke auf **"Load Policies"** in der oberen rechten Ecke.

<!-- SCREENSHOT: Hauptansicht nach Login, vor dem Laden der Policies -->
<!-- Dateiname: screenshot_02_main_empty.png -->
<!-- Beschreibung: Header mit "Load Policies" Button, leerer Content-Bereich -->

Die Policies werden aus allen 12 Policy-Typen parallel geladen. Ein Spinner zeigt den Ladevorgang.

<!-- SCREENSHOT: Geladene Policy-Liste mit allen Policies -->
<!-- Dateiname: screenshot_03_policy_list.png -->
<!-- Beschreibung: Tabelle mit Policies, Suchfeld, Typ-Filter-Dropdown, Spalten: Checkbox, Name, Type, Platform, Description -->

### Schritt 4: Policies auswaehlen

- **Einzeln:** Klicke auf eine Zeile in der Tabelle, um sie zu markieren/abzuwaehlen
- **Alle:** Nutze den **"Select All"** Button
- **Suche:** Nutze das Suchfeld, um nach Policy-Namen oder Beschreibungen zu filtern
- **Typ-Filter:** Filtere nach Policy-Typ ueber das Dropdown (z.B. nur "Settings Catalog")

<!-- SCREENSHOT: Policy-Liste mit einigen ausgewaehlten Policies (blaue Hervorhebung) -->
<!-- Dateiname: screenshot_04_policies_selected.png -->
<!-- Beschreibung: Mehrere Policies sind blau hinterlegt, Header zeigt "X policies found, Y selected" -->

### Schritt 5: LLM-Einstellungen anpassen (optional)

Klicke auf das **Zahnrad-Icon** in der oberen rechten Ecke, um die Einstellungen zu oeffnen.

<!-- SCREENSHOT: Settings-Panel / Modal mit System Prompt, Template und Custom Instructions -->
<!-- Dateiname: screenshot_05_settings.png -->
<!-- Beschreibung: Modal-Dialog mit drei Textareas: System Prompt, Output Template, Custom Instructions -->

Hier kannst du anpassen:

| Einstellung | Beschreibung |
|---|---|
| **System Prompt** | Definiert die Rolle und Regeln fuer das LLM |
| **Output Template** | Format-Vorlage fuer die generierte Beschreibung |
| **Custom Instructions** | Zusaetzliche Anweisungen (werden an den System Prompt angehaengt) |

Klicke **"Save"** um die Einstellungen zu speichern. Sie werden lokal in `backend/llm_settings.json` persistiert.

### Schritt 6: Beschreibungen generieren

Klicke auf **"Generate (N)"** im Header. Die Generierung startet und zeigt einen Fortschrittsbalken.

<!-- SCREENSHOT: Generierungs-Fortschrittsbalken -->
<!-- Dateiname: screenshot_06_generating.png -->
<!-- Beschreibung: Zentrierter Fortschrittsbalken mit "Generating description for: [Policy-Name]", aktuellem Zaehler (z.B. 3/12) -->

Fuer jede ausgewaehlte Policy wird:

1. Die vollstaendige Policy-Konfiguration von der Graph API geladen
2. Die Konfiguration als JSON an Azure OpenAI gesendet
3. Eine Beschreibung basierend auf System Prompt und Template generiert

### Schritt 7: Ergebnisse pruefen (Vorher/Nachher)

Nach der Generierung siehst du die Ergebnis-Ansicht mit Vorher/Nachher-Vergleich:

<!-- SCREENSHOT: Ergebnis-Ansicht mit Vorher/Nachher-Spalten -->
<!-- Dateiname: screenshot_07_results_before_after.png -->
<!-- Beschreibung: Pro Policy eine Karte mit: Header (Checkbox, Name, Typ-Badge), zwei Spalten: links "Original Description" (grau, read-only), rechts "Generated Description" (editierbares Textarea) -->

**Funktionen in der Ergebnis-Ansicht:**

| Aktion | Beschreibung |
|---|---|
| **Vorher/Nachher** | Links die aktuelle Beschreibung aus Intune, rechts die generierte |
| **Bearbeiten** | Die generierte Beschreibung kann direkt im Textarea bearbeitet werden |
| **Auswaehlen** | Per Klick auf die Karte wird die Policy fuer das Intune-Update markiert (blauer Rahmen) |
| **Select All / Deselect All** | Alle Policies auf einmal auswaehlen/abwaehlen |
| **Export** | Exportiert alle Beschreibungen als Markdown-Datei |

### Schritt 8: Beschreibungen in Intune schreiben

1. Waehle die Policies aus, die du in Intune aktualisieren moechtest (Klick auf die Karte oder "Select All")
2. Klicke auf **"Update in Intune (N)"**
3. Erfolgreich aktualisierte Policies erhalten ein gruenes **"Updated in Intune"** Badge

<!-- SCREENSHOT: Ergebnis-Ansicht mit einigen "Updated in Intune" Badges -->
<!-- Dateiname: screenshot_08_updated_policies.png -->
<!-- Beschreibung: Einige Policy-Karten haben gruenen Rahmen und ein gruenes Badge "Updated in Intune" mit Haekchen. Der Update-Button zeigt die verbleibende Anzahl. -->

> **Hinweis:** Nicht alle Policy-Typen unterstuetzen das Zurueckschreiben (siehe Tabelle oben). Policies ohne Schreibunterstuetzung erhalten eine Fehlermeldung.

---

## API-Referenz

Alle Endpoints sind unter `http://localhost:8099/api/` erreichbar. Interaktive Dokumentation unter `http://localhost:8099/docs`.

### Authentifizierung

| Methode | Endpoint | Beschreibung |
|---|---|---|
| `GET` | `/api/auth/status` | Auth-Status pruefen (nur lokaler Cache, kein Netzwerk) |
| `POST` | `/api/auth/login` | Interaktiven Browser-Login starten |

**GET /api/auth/status - Response:**

```json
{
  "authenticated": true,
  "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "user": "admin@contoso.onmicrosoft.com"
}
```

### Policies

| Methode | Endpoint | Beschreibung |
|---|---|---|
| `GET` | `/api/policies` | Alle Policies laden (12 Typen parallel) |
| `GET` | `/api/policies/{type}/{id}` | Policy-Details mit typ-spezifischen Settings |
| `GET` | `/api/policy-types` | Verfuegbare Policy-Typen und Labels |

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

### Generierung

| Methode | Endpoint | Beschreibung |
|---|---|---|
| `POST` | `/api/generate-single` | Beschreibung fuer eine einzelne Policy generieren |

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

### Beschreibungen aktualisieren

| Methode | Endpoint | Beschreibung |
|---|---|---|
| `POST` | `/api/update-descriptions` | Beschreibungen in Intune aktualisieren (Bulk) |

**POST /api/update-descriptions - Request:**

```json
{
  "updates": [
    {
      "policy_id": "abc-123",
      "policy_type": "deviceConfiguration",
      "description": "Neue Beschreibung..."
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

### LLM-Einstellungen

| Methode | Endpoint | Beschreibung |
|---|---|---|
| `GET` | `/api/settings` | Aktuelle LLM-Einstellungen laden |
| `PUT` | `/api/settings` | LLM-Einstellungen speichern |

---

## Projektstruktur

```
IntunePolicy/
|
|-- backend/
|   |-- main.py                 # FastAPI App, CORS, alle API-Endpoints
|   |-- auth.py                 # MSAL Authentifizierung, Token-Cache
|   |-- graph_client.py         # Async HTTP Client fuer Microsoft Graph API
|   |-- policy_fetcher.py       # Policy-Typen, Laden, Details, Update
|   |-- llm_service.py          # Azure OpenAI Integration
|   |-- models.py               # Pydantic Models (Policy, GenerationResult, etc.)
|   |-- config.py               # Environment-basierte Settings
|   |-- requirements.txt        # Python Abhaengigkeiten
|   |-- llm_settings.json       # Persistierte LLM-Einstellungen (generiert)
|   |-- .token_cache.json       # MSAL Token Cache (generiert, nicht committen!)
|   +-- venv/                   # Python Virtual Environment
|
|-- frontend/
|   |-- index.html              # HTML Entry Point
|   |-- package.json            # Node.js Abhaengigkeiten
|   |-- vite.config.ts          # Vite Config mit API Proxy
|   |-- tailwind.config.js      # Tailwind CSS Konfiguration
|   |-- tsconfig.json           # TypeScript Konfiguration
|   +-- src/
|       |-- main.tsx            # React Entry Point
|       |-- App.tsx             # Hauptkomponente (Routing, State)
|       |-- index.css           # Globale Styles, Glassmorphism
|       |-- api/
|       |   +-- client.ts       # API Client (fetch-basiert)
|       |-- types/
|       |   +-- index.ts        # TypeScript Interfaces, Labels
|       +-- components/
|           |-- PolicyList.tsx       # Policy-Tabelle mit Filter & Suche
|           |-- PolicyDetail.tsx     # Policy-Detail Ansicht
|           |-- SettingsPanel.tsx    # LLM-Einstellungen Modal
|           |-- GenerationProgress.tsx # Fortschrittsanzeige
|           +-- DescriptionResult.tsx  # Vorher/Nachher + Update
|
|-- .env.example                # Vorlage fuer Azure OpenAI Credentials
|-- .gitignore                  # Git Ignore Regeln
+-- start.sh                    # Start-Script fuer beide Server
```

### Datei-Details

#### `backend/auth.py`
- Verwendet die Microsoft Graph PowerShell App Registration (vorregistriert)
- Token wird im lokalen File-Cache gespeichert (`.token_cache.json`)
- `check_auth()` prueft nur den lokalen Cache (schnell, kein Netzwerk)
- `get_graph_token()` versucht Silent-Login, dann interaktiver Browser-Login
- Tenant-ID wird ueber `az account show` ermittelt und gecacht

#### `backend/graph_client.py`
- Singleton `GraphClient` mit Connection-Pooling via `httpx.AsyncClient`
- Automatische Token-Erneuerung bei 401-Responses
- `get_all()` folgt automatisch `@odata.nextLink` fuer Pagination
- `patch()` fuer Beschreibungs-Updates, behandelt 204 No Content

#### `backend/policy_fetcher.py`
- 12 Policy-Typen in `POLICY_ENDPOINTS` definiert
- `fetch_all_policies()` laedt alle Typen parallel via `asyncio.gather()`
- `fetch_policy_details()` laedt typ-spezifische Zusatzdaten:
  - Settings Catalog: `/{id}/settings`
  - Endpoint Security: `/{id}/categories` mit jeweiligen Settings
  - Group Policy: `/{id}/definitionValues`
- `update_policy_description()` handhabt PATCH inkl. `@odata.type` fuer Device Configurations
- `PATCHABLE_TYPES` definiert, welche Typen das Zurueckschreiben unterstuetzen

#### `backend/llm_service.py`
- Erstellt pro Request einen neuen `AsyncAzureOpenAI` Client
- `max_completion_tokens=1000` (nicht `max_tokens`, das wird von neueren Modellen nicht unterstuetzt)
- Keine `temperature`-Konfiguration (gpt-5-mini unterstuetzt nur den Default-Wert)
- Custom Instructions werden an den System Prompt angehaengt

#### `frontend/src/App.tsx`
- Drei Views: `policies` | `generating` | `results`
- Generierung erfolgt sequentiell (eine Policy nach der anderen) fuer Fortschritts-Tracking
- Original-Beschreibung wird aus der geladenen Policy-Liste an die Ergebnisse angehaengt

#### `frontend/src/components/DescriptionResult.tsx`
- Zwei-Spalten-Layout: Original (read-only) vs. Generiert (editierbar)
- Per-Policy Auswahl fuer selektives Intune-Update
- Tracking von erfolgreich aktualisierten Policies ("Updated in Intune" Badge)
- Markdown-Export aller Beschreibungen

---

## Fehlerbehebung

### "Not Authenticated" obwohl ich eingeloggt bin

Der Token-Cache ist ggf. abgelaufen. Klicke erneut auf "Sign in with Microsoft" - es oeffnet sich der Browser fuer die Anmeldung.

### 403 Forbidden bei Policy-Abrufen

Der angemeldete Benutzer hat nicht die erforderlichen Intune-Berechtigungen. Stelle sicher, dass der Benutzer mindestens "Intune Administrator" oder entsprechende Rollen hat.

### Port-Konflikte

Falls Port 8099 oder 5173 belegt sind:

**Backend-Port aendern:**
```bash
uvicorn main:app --reload --port NEUER_PORT
```

Zusaetzlich in `frontend/vite.config.ts` den Proxy anpassen:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:NEUER_PORT',
  },
},
```

### "max_tokens is not supported"

Dieses Problem wurde bereits geloest. Das Tool verwendet `max_completion_tokens` statt `max_tokens`. Falls der Fehler trotzdem auftritt, pruefe ob `llm_service.py` aktuell ist.

### PATCH-Fehler bei Device Configurations

Device Configuration Policies benoetigen `@odata.type` im PATCH-Body. Das Tool liest diesen Wert automatisch aus der bestehenden Policy. Falls der Fehler weiterhin auftritt, ist die Policy moeglicherweise schreibgeschuetzt.

### Python 3.14 Build-Fehler

`pydantic-core` laesst sich unter Python 3.14 nicht kompilieren. Verwende Python 3.11 - 3.13:
```bash
python3.13 -m venv venv
```

### Seite bleibt weiss / React-Fehler

Oeffne die Browser-Konsole (F12 > Console) und pruefe auf JavaScript-Fehler. Haeufige Ursache: Backend ist nicht erreichbar. Stelle sicher, dass beide Server laufen.

---

## Sicherheitshinweise

- **Azure OpenAI Credentials** werden in `backend/config.py` als Defaults gespeichert. Fuer Produktionsumgebungen ausschliesslich ueber `.env`-Datei oder Umgebungsvariablen konfigurieren.
- **Token-Cache** (`.token_cache.json`) enthaelt Refresh-Tokens und darf nicht in Git eingecheckt werden.
- Die Anwendung verwendet die **Graph API Beta** - diese kann sich ohne Vorankuendigung aendern.
- **ReadWrite-Berechtigungen**: Die Anwendung fordert `DeviceManagementConfiguration.ReadWrite.All` an, um Beschreibungen zurueckschreiben zu koennen. Dieses Recht erlaubt theoretisch auch andere Aenderungen - die Anwendung nutzt es jedoch ausschliesslich fuer Description-Updates via PATCH.
- Die Anwendung laeuft **lokal** und sendet Daten nur an Microsoft Graph und Azure OpenAI. Es werden keine Daten an Dritte uebermittelt.

---

## Screenshots - Uebersicht

Fuer eine vollstaendige Dokumentation werden folgende Screenshots benoetigt:

| Nr. | Dateiname | Beschreibung | Wo aufnehmen |
|-----|-----------|--------------|--------------|
| 1 | `screenshot_01_login.png` | Login-Screen mit "Sign in with Microsoft" Button | http://localhost:5173 (vor Login) |
| 2 | `screenshot_02_main_empty.png` | Hauptansicht nach Login, vor Policy-Laden | Nach erfolgreichem Login |
| 3 | `screenshot_03_policy_list.png` | Geladene Policy-Liste mit Suchfeld und Filter | Nach Klick auf "Load Policies" |
| 4 | `screenshot_04_policies_selected.png` | Policy-Liste mit ausgewaehlten Policies | Einige Policies anklicken |
| 5 | `screenshot_05_settings.png` | Settings-Modal mit System Prompt, Template, Custom Instructions | Klick auf Zahnrad-Icon |
| 6 | `screenshot_06_generating.png` | Fortschrittsbalken waehrend Generierung | Waehrend "Generate" laeuft |
| 7 | `screenshot_07_results_before_after.png` | Ergebnis-Ansicht mit Vorher/Nachher-Spalten | Nach abgeschlossener Generierung |
| 8 | `screenshot_08_updated_policies.png` | Policies mit "Updated in Intune" Badge | Nach Klick auf "Update in Intune" |

> Erstelle die Screenshots in der Reihenfolge 1-8 waehrend eines Durchlaufs und speichere sie im Projektroot unter `docs/screenshots/`.
