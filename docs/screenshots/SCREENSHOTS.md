# Benoetigte Screenshots

Erstelle die Screenshots in der Reihenfolge 1-8 waehrend eines kompletten Durchlaufs der App.

| Nr. | Dateiname | Was zeigen | Wie aufnehmen |
|-----|-----------|------------|---------------|
| 1 | `screenshot_01_login.png` | Login-Screen mit Schloss-Icon und "Sign in with Microsoft" Button | App oeffnen vor dem Login (http://localhost:5173) |
| 2 | `screenshot_02_main_empty.png` | Hauptansicht nach Login, leerer Content mit "Load Policies" Button | Direkt nach erfolgreichem Microsoft-Login |
| 3 | `screenshot_03_policy_list.png` | Vollstaendige Policy-Tabelle mit Suchfeld, Typ-Filter und allen Spalten (Name, Type, Platform, Description) | Nach Klick auf "Load Policies", warten bis alle geladen |
| 4 | `screenshot_04_policies_selected.png` | Mehrere Policies blau markiert, Header zeigt "X policies found, Y selected" | 5-10 Policies per Klick auswaehlen |
| 5 | `screenshot_05_settings.png` | Settings-Modal mit drei Textareas: System Prompt, Output Template, Custom Instructions | Klick auf Zahnrad-Icon oben rechts |
| 6 | `screenshot_06_generating.png` | Zentrierter Fortschrittsbalken mit aktuellem Policy-Namen und Zaehler (z.B. "3/12") | Waehrend "Generate" laeuft - schnell screenshotten |
| 7 | `screenshot_07_results_before_after.png` | Ergebnis-Karten mit zwei Spalten: links "Original Description" (grau), rechts "Generated Description" (editierbar) | Nach abgeschlossener Generierung |
| 8 | `screenshot_08_updated_policies.png` | Einige Policies mit gruenem "Updated in Intune" Badge und Haekchen, andere noch auswaehlbar | 2-3 Policies auswaehlen, "Sync to Intune" klicken, dann screenshotten |

## Tipps

- Browserbreite ca. 1400px fuer optimale Darstellung
- Fuer Screenshot 6 (Generating): Timer starten oder Video aufnehmen und Frame extrahieren
- Fuer Screenshot 8: Erst nur 2-3 Policies updaten, damit man den Unterschied zwischen "updated" und "noch nicht updated" sieht
- Alle Screenshots in diesen Ordner (`docs/screenshots/`) ablegen
- In der README.md die HTML-Kommentar-Platzhalter durch `![Beschreibung](docs/screenshots/dateiname.png)` ersetzen
