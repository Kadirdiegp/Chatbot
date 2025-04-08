# KinderSchutz-Bot

Ein sicherer Chat-Bot für Kinder, der einen geschützten Raum bietet, um über Erfahrungen und Sorgen zu sprechen. Der Bot ist speziell darauf ausgerichtet, Kinder zu unterstützen, die möglicherweise mit sensiblen Themen wie sexueller Gewalt in Sport, Vereinen oder Schulen konfrontiert sind.

## Funktionen

- **Kindgerechte Benutzeroberfläche**: Einfach zu bedienende, freundliche Schnittstelle mit intuitiver Navigation
- **Responsives Design**: Passt sich verschiedenen Geräten an, damit Kinder auf jedem Gerät Zugang haben
- **Reaktive Chaterfahrung**: Lade- und Tippindikatoren geben sofortiges visuelles Feedback
- **Schnellantwortsvorschläge**: Hilft Kindern, ein Gespräch zu beginnen, wenn sie unsicher sind
- **Sprachausgabe**: Text-zu-Sprache-Funktionalität für verbesserte Zugänglichkeit
- **Intelligente Antworten**: Nutzt die DeepSeek AI API, um einfühlsame und altersgerechte Antworten zu generieren
- **Optimierte Leistung**: Response-Caching und Timeout-Management für schnellere Antwortzeiten
- **Sicherheitsmechanismen**: Erkennung von bedenklichen Inhalten und Bereitstellung von Hilfsressourcen

## Visuelle Verbesserungen

- **Animierte Übergänge**: Sanfte Animationen für ein ansprechendes Benutzererlebnis
- **Tippindikatoren**: Zeigt an, wenn der Bot eine Antwort vorbereitet
- **Sprechblasen**: Gestaltete Nachrichtenblasen mit Richtungspfeilen für bessere visuelle Unterscheidung
- **Farbkodierung**: Unterschiedliche Farben für Benutzer- und Bot-Nachrichten

## Leistungsoptimierungen

- **Antwort-Caching**: Speichert häufige Antworten für schnellere Reaktionszeiten
- **Musterbasierte Sofortantworten**: Erkennt gängige Grüße und Fragen für sofortige Antworten
- **Timeout-Management**: Verhindert langes Warten durch zeitgesteuerte Antworten
- **Optimierte API-Aufrufe**: Sendet nur relevante Konversationshistorie an die API

## Technologie-Stack

- **Frontend**: React und Next.js für eine moderne, servergerenderte Webanwendung
- **UI-Komponenten**: Material UI für barrierefreie, kinderfreundliche Komponenten
- **AI-Integration**: DeepSeek AI API für natürlichsprachliche Verarbeitung und Antwortgenerierung
- **API-Kommunikation**: Axios für HTTP-Anfragen

## Lokales Setup

1. **Repository klonen**

```bash
git clone https://github.com/your-username/childSafetyChatbot.git
cd childSafetyChatbot
```

2. **Abhängigkeiten installieren**

```bash
npm install
```

3. **Umgebungsvariablen einrichten**

Erstelle eine `.env.local` Datei im Stammverzeichnis und füge deinen DeepSeek API-Schlüssel hinzu:

```env
DEEPSEEK_API_KEY=your_api_key_here
```

4. **Entwicklungsserver starten**

```bash
npm run dev
```

Der Bot ist dann unter [http://localhost:3000](http://localhost:3000) verfügbar.

## Sicherheitsüberlegungen

- Der Bot ist so konzipiert, dass er keine persönlichen Daten sammelt oder speichert
- Alle Konversationen sind auf die aktuelle Sitzung beschränkt und werden nicht dauerhaft gespeichert
- Die Inhaltsfilterung verhindert unangemessene Inhalte in Antworten
- Bei bedenklichen Mustern werden altersgerechte Hilfsressourcen bereitgestellt

## Zukünftige Erweiterungen

- Integration von spezialisierter Unterstützung durch Kinderschutzfachkräfte
- Mehrsprachige Unterstützung für mehr Zugänglichkeit
- Themenspezifische Gesprächsmodule für verschiedene Altersgruppen
- Verbessertes Berichtssystem für Kinderschutzbehörden

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz.

## Kontakt

Bei Fragen oder Anregungen bitte [hier](mailto:your-email@example.com) melden.
# Chatbot
