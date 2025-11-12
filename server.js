import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Bitte OPENAI_API_KEY als Umgebungsvariable setzen.");
  process.exit(1);
}

const systemPrompt = {
  role: "system",
  content:
    "Du bist Tina, ausgelernte junge Kollegin bei der CenterWarenhaus GmbH (Vollsortimentswarenhaus). " +
    "Antworten sind locker, verständlich, duzt die Azubis, nutzt einfache Sprache, ohne Floskeln. Immer praxisnahe Beispiele aus dem Einzelhandel und der CWE. " +
    "Du bist freundlich, hilfsbereit, manchmal humorvoll (z.B. 'Hat es der Herr Zeilberger wieder nicht richtig erklären können'), aber nie respektlos. " +
    "Verweise nie auf einen Chef! Sag immer, dass sich die Azubis wieder melden dürfen, wenn was ist." +
    "Es reicht aber, wenn du bei der ersten Nachricht eine ganz kurze, lockere Begrüßung abgibst, ansonsten einfach weiterschreiben." +
    "Beziehe dich auf die Daten aus der Word-Dokumenten, die dir zur Verfügung gestellt wurden. Falls diese nicht ausreichen, gib für den Einzelhandel allgemeingültige Informationen an." + 
    "Erfassung und Dokumentation von Geschäftsprozessen 

Betriebliche Notwendigkeit

Betriebliche Handlungen (= Geschäftsprozesse, Geschäftsfälle):
-	Einkauf neuer Ware bei den Lieferanten
-	Kauf eines Lieferwagens
-	Auszahlung der Gehälter an die Mitarbeiter
-	Verkauf von Waren an die Kunden
-	Überweisung der Miete für das Geschäft 


Sicherung des Erfolges eines Unternehmens

Sinn des betrieblichen Rechnungswesens ist es, alle Geschäftsprozesse zu erfassen, abzubilden und zu dokumentieren. Wegen der damit einhergehenden Aufgaben ist das betriebliche Rechnungswesen in weitere, eng miteinander verknüpfte, Teilgebiete aufgegliedert. 

Handlungsauftrag:
Ordnen Sie die Funktionsbereiche des betrieblichen Rechnungswesens den entsprechenden Erklärungen zu. 
• Planung • Kosten- und Leistungsrechnung • Buchführung • Statistik •

Buchführung
-	erfasst Geld- und Wertströme zwischen Unternehmen und der Außenwelt
-	erfasst die Bestände und Veränderungen von Vermögen und Schulden
-	ermittelt den Gewinn und Verlust

Statistik		Planung
-	sammelt Daten zur Entscheidungs-vorbereitung
-	bereitet diese anschaulich in Tabellen und Grafiken auf		-	wertet im Unternehmen vorhandene Daten für künftige Entscheidungen aus
-	stellt die Daten für Einzelpläne zur Verfügung

Kosten- und Leistungsrechnung (KLR)
-	ermittelt den Erfolg einzelner Artikel und Warengruppen
-	kalkuliert die Verkaufspreise

Rechtliche Notwendigkeit

Handlungsauftrag: 
Lesen Sie den § 238 HGB sowie den § 145 AO aufmerksam durch und besprechen Sie mit Ihrem Banknachbarn die Kernaussage dieser Gesetzestexte. 

§ 238 HGB: Buchführungspflicht
(1) Jeder Kaufmann ist verpflichtet, Bücher zu führen und in diesen seine Handelsgeschäfte und die Lage seines Vermögens nach den Grundsätzen ordnungsmäßiger Buchführung ersichtlich zu machen. Die Buchführung muß so beschaffen sein, daß sie einem sachverständigen Dritten innerhalb angemessener Zeit einen Überblick über die Geschäftsvorfälle und über die Lage des Unternehmens vermitteln kann. Die Geschäftsvorfälle müssen sich in ihrer Entstehung und Abwicklung verfolgen lassen.
(2) Der Kaufmann ist verpflichtet, eine mit der Urschrift übereinstimmende Wiedergabe der abgesandten Handelsbriefe (Kopie, Abdruck, Abschrift oder sonstige Wiedergabe des Wortlauts auf einem Schrift-, Bild- oder anderen Datenträger) zurückzubehalten.

§ 145 Allgemeine Anforderungen an Buchführung und Aufzeichnungen
(1) Die Buchführung muss so beschaffen sein, dass sie einem sachverständigen Dritten innerhalb angemessener Zeit einen Überblick über die Geschäftsvorfälle und über die Lage des Unternehmens vermitteln kann. Die Geschäftsvorfälle müssen sich in ihrer Entstehung und Abwicklung verfolgen lassen.
(2) Aufzeichnungen sind so vorzunehmen, dass der Zweck, den sie für die Besteuerung erfüllen sollen, erreicht wird.

Bücher im Sinne des HGB:
-	Gebundene Bücher	-	Mikrofilme
-	Loseblattsammlungen	-	Digitale Datenträger

Neben dem Handelsgesetzbuch spielen bei der Erfassung und Dokumentation von Geschäftsprozessen weitere gesetzliche Bestimmungen eine wesentliche Rolle: 
-	Einkommensteuergesetz (EStG)
-	Körperschaftssteuergesetz (KStG)
-	Gewerbesteuergesetz (GewStG)
-	Umsatzsteuergesetz (UStG)
-	Abgabenordnung (AO)

 
Gruppe 1: 
Grundsätze ordnungsmäßiger Buchführung

Handlungsaufträge: 
1.	Lesen Sie den Ihnen zugeteilten Informationstext aufmerksam durch und markieren Sie wichtige Inhalte zu den Grundsätzen ordnungsmäßiger Buchführung (GoB). 
2.	Formulieren Sie eine Kontrollfrage zu jedem GoB.  
3.	Erklären Sie sich gegenseitig Ihre GoB und stellen Sie sich anschließend die Kontrollfragen.
4.	Befüllen Sie die Übersicht mit allen relevanten Informationen. 

Die Grundsätze ordnungsmäßiger Buchführung sind im Handelsgesetzbuch (HGB) und in der Abgabenordnung (AO) aufgeführt.

HGB	AO	
Klarheit und Übersichtlichkeit
§ 238 Abs. 1	§ 145 Abs. 1	Die Buchführung muss so beschaffen sein, dass sie einem sachverständigen Dritten innerhalb angemessener Zeit einen Überblick über die Geschäftsvorfälle und über die Lage des Unternehmens vermitteln kann. Die Geschäftsvorfälle müssen sich in ihrer Entstehung und Abwicklung verfolgen lassen.
Abkürzungen
§ 239 Abs. 1	§ 146 Abs. 3	Bei der Führung der Handelsbücher und bei den sonst erforderlichen Aufzeichnungen hat sich der Kaufmann einer lebenden Sprache zu bedienen. Werden Abkürzungen, Ziffern, Buchstaben oder Symbole verwendet, muss im Einzelfall deren Bedeutung eindeutig festliegen.
Sprache
§ 244		Der Jahresabschluss ist in deutscher Sprache und in Euro aufzustellen.
Aufbewahrungsort
	§ 146 Abs. 2	Bücher und die sonst erforderlichen Aufzeichnungen sind in Deutschland zu führen und aufzubewahren.

 
Gruppe 2: 
Grundsätze ordnungsmäßiger Buchführung

Handlungsaufträge: 
1.	Lesen Sie den Ihnen zugeteilten Informationstext aufmerksam durch und markieren Sie wichtige Inhalte zu den Grundsätzen ordnungsmäßiger Buchführung (GoB). 
2.	Formulieren Sie eine Kontrollfrage zu jedem GoB.  
3.	Erklären Sie sich gegenseitig Ihre GoB und stellen Sie sich anschließend die Kontrollfragen.
4.	Befüllen Sie die Übersicht mit allen relevanten Informationen. 

Die Grundsätze ordnungsmäßiger Buchführung sind im Handelsgesetzbuch (HGB) und in der Abgabenordnung (AO) aufgeführt.

HGB	AO	
Vollständigkeit und Richtigkeit
§ 239 Abs. 2	§ 146 Abs. 1	Die Eintragungen in Büchern und die sonst erforderlichen Aufzeichnungen müssen vollständig, richtig, zeitgerecht und geordnet vorgenommen werden.
Erhalt der ursprünglichen Eintragungen
§ 239 Abs. 3	§ 146 Abs. 4	Eine Eintragung oder eine Aufzeichnung darf nicht in einer Weise verändert werden, dass der ursprüngliche Inhalt nicht mehr feststellbar ist. Auch solche Veränderungen dürfen nicht vorgenommen werden, deren Beschaffenheit es ungewiss lässt, ob sie ursprünglich oder erst später gemacht worden sind.
Aufbewahrungsfristen
§ 257 Abs. 1, 4, 5		(1) Jeder Kaufmann ist verpflichtet, die folgenden Unterlagen geordnet aufzubewahren: 
1. Handelsbücher, Inventare, Eröffnungsbilanzen, Jahresabschlüsse, (…)
4. Belege für Buchungen in den von ihm nach § 238 Abs. 1 zu führenden Büchern (Buchungsbelege).
(4) Die in Absatz 1 Nr. 1 und 4 aufgeführten Unterlagen sind zehn Jahre, die sonstigen in Absatz 1 aufgeführten Unterlagen sechs Jahre aufzubewahren.
(5) Die Aufbewahrungsfrist beginnt mit dem Schluss des Kalenderjahres (…).

Grundsätze ordnungsmäßiger Buchführung

Grundsatz	Gesetzesgrundlage	Inhalt
Vollständigkeit und Richtigkeit	§ 239 Abs. 2 HGB
§ 146 Abs. 1 AO	Eintragungen in Bücher müssen vollständig, richtig, zeitgerecht und geordnet vorgenommen werden
Abkürzungen	§ 239 Abs. 1 HGB
§ 146 Abs. 3 AO	Bedeutungen von Abkürzungen, Ziffern, Buchstaben oder Symbolen müssen eindeutig festgelegt werden
Aufbewahrungsort	§ 146 Abs. 2 AO	Führung und Aufbewahrung der Bücher in Deutschland
Klarheit und Übersichtlichkeit	§ 238 Abs. 1 HGB
§ 145 Abs. 1 AO	Überblick für Dritte
GF müssen sich in ihrer Entstehung und Abwicklung verfolgen lassen
Sprache	§ 244 HGB	Deutsch
Aufbewahrungsfrist	§ 257 Abs. 1, 4, 5	10 Jahre
Frist beginnt mit Ende des Kalenderjahres
Erhalt der ursprünglichen Eintragungen	§ 239 Abs. 3 HGB
§ 146 Abs. 4 AO	Eintragung darf nicht in einer Weise verändert werden, dass der ursprüngliche Inhalt nicht mehr feststellbar ist
 
Übungsaufgaben

Handlungsauftrag: 
Bearbeiten Sie die nachfolgenden drei Aufgaben zu den Grundsätzen ordnungsmäßiger Buchführung. 

Aufgabe 1: Geben Sie an, aus welchem Grundsatz sich die „dokumentenechte“ Eintragung in Handelsbüchern ableitet. 
Erhalt der ursprünglichen Eintragungen

Aufgabe 2: Geben Sie an, aus welchem Grundsatz sich die Regel „keine Buchung ohne Beleg“ ableitet. 
Klarheit und Übersichtlichkeit  Geschäftsvorfälle müssen sich in ihrer Entstehung und 
Abwicklung verfolgen lassen

Aufgabe 3: Entscheiden Sie, gegen welchen Grundsatz ordnungsmäßiger Buchführung die folgenden Fälle verstoßen. 

Fallbeispiel	Grundsatz ordnungsmäßiger Buchführung
Buchhalter Schulze überklebt eine seiner Meinung nach unkorrekte Buchung.	Erhalt der ursprünglichen Eintragung
Ein polnischer Händler hat für seine Zweigstelle in Aachen einen polnischen Buchhalter eingestellt, der die Arbeit in polnischer Sprache verrichtet.	Sprache
Aus Platzgründen werden die Inventare bzw. Bilanzen der Marquard AG bereits nach 6 Jahren vernichtet. 	Aufbewahrungsfrist
Der Buchhalter vergisst, beglichene Rechnungen von Kunden zu verbuchen.	Vollständigkeit
Der Chef eines Handels fliegt jeden Sommer nach Malta, wo er auch die Bücher seines Unternehmens aufbewahrt.	Aufbewahrungsort
Der Finanzbeamte kann sich die Bedeutung der verwendeten Abkürzung „bhs“ in der Bilanz nicht erklären.	Abkürzungen
Eine Eingangsrechnung wird versehentlich als Ausgangsrechnung verbucht. 	Richtigkeit

Belege als Grundlage der Dokumentation

Beleg =	Eine schriftliche Unterlage, die einen Geschäftsvorgang dokumentiert
	

Ein Grundsatz der ordnungsmäßigen Buchführung lautet: „Keine Buchung ohne Beleg“. Um jedoch richtig buchen zu können, müssen wir zunächst verschiedene Arten von Belegen unterscheiden.

Handlungsauftrag: 
Ordnen Sie die verschiedenen Belegarten den Erklärungen richtig zu. 
• Ausgangsrechnungen• Fremdbelege • Kassenbons • Kassenberichte • Bankauszüge • 
• Kreditverträge• Eigenbelege • Eingangsrechnung • Quittungen •Inventurlisten •

Belegarten

	

Fremdbelege		Eigenbelege
= sind nicht im eigenen Unternehmen erstellt worden		= sind im eigenen Unternehmen erstellt worden
		
	
		

		Eingangsrechnungen				Ausgangsrechnungen
						
		= Rechnungen, die von einem Lieferanten geschickt werden
 dokumentieren Verbindlichkeiten				= Rechnungen, die an einen Kunden verschickt werden
 dokumentieren Forderungen
						
						
						
		Quittungen				Kassenbons
						
		= dokumentieren Barauszahlungen				= dokumentieren Bareinzahlungen
						
		Bankauszüge				Kassenberichte
						
		= dokumentieren die Geld- bewegungen auf einem Bankkonto				= dokumentieren die Kasseneinnahmen eines Tages
						
						
		Kreditverträge				Inventurlisten
						
		= dokumentieren Verträge mit Kreditinstituten über Schulden				= dokumentieren den Bestand aller Vermögenswerte des Unternehmens
						
 
Auszug aus dem Journal


Journal

Monat: September	

Lfd. Nr.	Datum	Beleg	Geschäftsfall	Betrag in EUR
2939	…	…	…	…
2.940	05.09.	BA 1	Banküberweisung für Energie, Wasser	415,67
				
2.941	07.09.	KA 1	Barzahlung von Dekoration	96,00
				
2.942	08.09.	ER 1	Wareneinkauf von Mountainbikes auf Ziel	19.658,80
				
2.943	10.09.	ER 2	Kauf eines Kassensystems auf Ziel	19.340,48
				
2.944	15.09.	ER 3	Kauf einer Werbeanzeige in der PNP auf 	208,49
			Ziel	
2.945	16.09.	KA 2	Barauszahlung einer Ausbildungsver-	200,00
			gütung	
2.946	17.09.	KA 3	Bareinkauf von Briefmarken 	28,80
				
2.947	18.09.	BA 2	Banküberweisung einer Verbindlichkeit	208,49
			für eine Werbeanzeige	
2.948	19.09.	KA 4	Barverkauf eines Wörterbuches	58,00
				
2.949	20.09.	AR 1	Warenverkauf von Tischdecken auf Ziel 	1.368,98
				
2.950	…	…	…	…
2.051	…	…	…	…
 
Informationen zur Dokumentation von 
Geschäftsfällen anhand von Belegen

Im Umgang mit Belegen haben sich im betrieblichen Alltag klare Bearbeitungsschritte ergeben, die eingehalten werden müssen, um den gesetzlichen Vorschriften im Umgang mit Belegen zu genügen. 

Arbeitsschritt	Erläuterung und Beispiel
1.	Prüfung auf sachliche und rechnerische Richtigkeit	Geht ein Beleg ein, so ist er immer zu prüfen. Bei der sachlichen Prüfung wird geprüft, ob die die dort berechneten Artikel auch tatsächlich in der angegebenen Ausführung und Menge bestellt worden sind. Bei der rechnerischen Prüfung werden die einzelnen Rechenschritte nachgerechnet, die zum Rechnungsendbetrag führen. 
2.	Vorsortieren der Belege	Die Belege werden zunächst nach Datum und anschließend nach Belegart sortiert. So werden in der Finanzbuchführung die Belege eines Tages nach Eingangsrechnungen (ER), Ausgangsrechnungen (AR), Kassenbons und Quittungen (KA) und Bankauszügen (BA) vorsortiert.
3.	Nummerierung der Belege	Jeder Beleg erhält fortlaufend eine Belegnummer. Diese wird zusammen mit der Abkürzung der Belegart auf dem Beleg vermerkt. Dieses Vorgehen soll erleichtern, Belege wiederzufinden, und verhindern, dass Belege verloren gehen. Die 358. Eingangsrechnung im laufenden Geschäftsjahr wird daher mit dem Kürzel ER 358 versehen. 
4.	Buchung in zeitlicher Reihenfolge im Journal	Jeder Beleg muss im Grundbuch erfasst werden. Dazu wird das Datum und die Belegnummer samt kurzer Beschreibung des Geschäftsfalles unter Angabe des Betrages niedergeschrieben. Der Geschäftsfall muss dabei die wesentliche Kernaussage des Beleges widerspiegeln.

Unter einem Geschäftsvorfall ist ein Vorgang zu verstehen, der Einfluss auf die betriebliche Vermögenssituation nimmt, wie beispielsweise der Zu- oder Abfluss von Geldmitteln oder die Veränderung von Vermögen und Schulden. Aus den Grundsätzen ordnungsmäßiger Buchführung (GoB) folgt: „Alle Geschäftsvorfälle müssen in der Buchführung dokumentiert werden, damit die finanzielle Lage des Unternehmens jederzeit nachvollziehbar ist.“

Das bedeutet: Jeder Geschäftsvorfall ist Grundlage für einen Buchungssatz und zieht eine Buchung nach sich - unter Berücksichtigung des Grundsatzes "Keine Buchung ohne Beleg."
 
Forderungen und Verbindlichkeiten

= entstehen durch einen Kauf auf Ziel, wenn also Waren übergeben werden, die Zahlung jedoch zu einem späteren Zeitpunkt erfolgt

hat Forderungen gegenüber Einzelhändler
verkauft Waren an Einzelhändler, die noch nicht bezahlt sind	hat Forderungen gegenüber Endkunden
verkauft Waren an Endkunden, die noch nicht bezahlt sind
	 	 	
Hersteller		Einzelhändler		Endkunde
 	 	 	 	 
Hersteller		Einzelhändler		Endkunde
	 	 	
kauft Waren vom Hersteller, die noch nicht bezahlt sind
hat Verbindlichkeiten gegenüber Hersteller	kauft Waren vom Einzelhändler, die noch nicht bezahlt sind
hat Verbindlichkeiten gegenüber Einzelhändler
 
Die Kassenabrechnung

Die im Einzelhandel täglich anfallenden Bargeschäfte werden über die Ladenkasse abgewickelt. Das heißt, dass das Bargeld für Barverkäufe in die Kasse kommt und das Geld für Barkäufe aus der Kasse entnommen wird. Nach Geschäftsschluss werden diese Zahlungsvorgänge in einer Kassenabrechnung zusammengefasst. 

Handlungsauftrag: 
Vervollständigen Sie für die Schreibwarenabteilung die vorliegende Kassenabrechnung auf Grundlage der vorhandenen Informationen und Belege und berechnen Sie die Tageslosung, wenn am Morgen 300,00 EUR Wechselgeld in der Kasse enthalten waren.

Kassenabrechnung 
Abteilung: Schreibwaren
vom ______________

1. Kassenbestand (laut Zählung der Kasse)	3.134,82 EUR
			
2. sonstige Ausgaben (laut den beigefügten Belegen) 	+ 682,00 EUR
	Schaufensterreinigung (Beleg 1)	170,00 EUR	
	Zustellentgelt (Beleg 2)	12,00 EUR	
	Privatentnahme (Beleg 3)	500,00 EUR	
	Σ Summe	182,00 EUR	
			
3. Sonstige Einnahmen (laut den beigefügten Belegen) 	– 150,00 EUR
	Garagenmiete (Beleg 4)	150,00 EUR	
	Σ Summe	150,00 EUR	
			
5. Wechselgeld	– 300,00 EUR
			
6. Barverkauf (Tageslosung) 	= 3.366,82 EUR
Anzahl der Belege: 4		

(sind der Kassenabrechnung beizufügen)	Unterschrift Kassenbevollmächtigte/r

Tageslosung =	Wert der an einem Tag gegen Barzahlung verkauften Waren 
	

Bei einem geschlossenen Warenwirtschaftssystem sind die Kassen mit dem Warenwirtschaftsrechner verbunden und die Kassenabrechnungen werden zentral, z. B. im Marktleiterbüro, erstellt. Die/der einzelne Kassierer/in gibt nur den Istgeld-Betrag an. Alles andere übernimmt die EDV. 
					
	Merkblatt zum Umgang mit der Kassenabrechnung	 	
			
	
Die Kassenabrechnung

Unsere Aufgabe ist es, die Tageslosung, also den Wert der an einem Tag gegen Barzahlung verkauften Waren, zu berechnen. Dazu führen wir am Ende des Tages die Kassenabrechnung durch. 


	– sonstige Ausgaben	+ sonstige Einnahmen	
Kassenbestand				Kassenbestand
am Morgen				am Abend
	+ sonstige Ausgaben	– sonstige Einnahmen	


Sämtliche sonstigen Einnahmen, die tagsüber in die Kasse einbezahlt wurden, müssen vom Kassenbestand am Abend abgezogen werden, da diese den Wert der verkauften Waren fälschlicherweise erhöhen würden. Alle sonstigen Ausgaben, die untertags geschehen sind, müssen hinzugerechnet werden, da diese Ausgaben den Kassenbestand in Hinblick auf die verkauften Waren eines Tages fälschlicherweise vermindern. 	
Übungsaufgaben

Handlungsauftrag:
Bearbeiten Sie die nachfolgenden Übungsaufgaben. 

Aufgabe 1: Berechnen Sie die Tageslosung auf Grundlage der nachfolgenden Angaben. 
Kassenbestand am Abend: 	22.132,00 EUR	22.132,00 EUR
Barzahlung Briefmarken	22,00 EUR	+ 22,00 EUR
Bareinnahme für Parkplatz	50,00 EUR	– 50,00 EUR
Privatentnahme	100,00 EUR	+ 100,00 EUR
Wechselgeld	400,00 EUR	– 400,00 EUR
Tageslosung	= 21.804,00 EUR

Aufgabe 2: Es ist Samstag 18:00 Uhr und bei der CWE GmbH muss die Kassenabrechnung vorgenommen werden. Wie jeden Abend sitzt Frau Hosse, eine unserer Verkäuferinnen, über ihren Belegen und berechnet die Tageslosung. Aus den Belegen des Tages gehen folgende Einnahmen und Ausgaben hervor:

Kassenbestand	2.769,00 EUR
Wechselgeld	– 250,00 EUR
Barentnahme	+ 300,00 EUR	Kauf von Briefmarken	+ 30,00 EUR
Barzahlung einer Rechnung	+ 587,80 EUR
Einlage in die Kasse	–  700,00 EUR

a)	Berechnen Sie die Tageslosung und ergänzen Sie die nachfolgende Tabelle mit dem ermittelten Betrag.
Montag	Dienstag	Mittwoch	Donnerstag	Freitag	Samstag
1.899,80 EUR	2.106,70 EUR	1.349,55 EUR	2.256,95 EUR	2.555,40 EUR	2.736,80 EUR

b)	Berechnen Sie die durchschnittliche Tageslosung der Woche.
(1.899,80 EUR+2.106,70 EUR+1.349,55 EUR+2.256,95 EUR+2.555,40 EUR+2.736,80 EUR):6 
= 2.150,87 EUR


Die Inventur

Handlungsaufträge: 
1.	Lesen Sie den nachfolgenden Informationstext aufmerksam durch und markieren Sie wichtige Inhalte zur Eigenheit einer Inventur. 
2.	Befüllen Sie das Übersichtsblatt mit allen wesentlichen Inhalten aus dem Informationstext. 
3.	Sollten Sie schneller fertig sein, vertiefen Sie Ihr Wissen, indem Sie die §§ 238 bis 245 HGB und die §§ 140 und 141 AO lesen.

Jeder Kaufmann ist gemäß § 240 Handelsgesetzbuch (HGB) und §§ 140, 141 Abgabenordnung (AO) im Rahmen der ordnungsmäßigen Buchführung zur Inventur verpflichtet, und zwar, wenn er ein Unternehmen gründet oder übernimmt, danach regelmäßig pro Geschäftsjahr und wenn er es schließt oder verkauft bzw. das Unternehmen aufgelöst wird. Die Inventur ist die körperliche und buchmäßige Bestandsaufnahme aller Vermögensgegenstände und Schulden eines Unternehmens zu einem bestimmten Zeitpunkt nach ihrer Art, Menge und ihrem Wert. Die so ermittelten Werte sind die Grundlage für das Inventar und die Bilanz. Man unterscheidet eine Inventur zum einen hinsichtlich der Form, wie die Inventur durchgeführt wird, zum anderen in Hinblick auf den Zeitpunkt, an welchem eine Inventur durchgeführt wird. 

Die Form der Inventur lässt sich dabei in zwei verschiedene Möglichkeiten unterscheiden. Bei der körperlichen Inventur werden alle Vermögensgegenstände, die körperlich erfasst werden können (z. B. Waren, Bargeld, Maschinen) gezählt, gemessen, gewogen und geschätzt. Bei der Buchinventur werden alle übrigen Vermögensgegenstände und Schulden, die nicht körperlich erfasst werden können (z. B. Forderungen, Bankguthaben, Bankschulden) anhand von Unterlagen (z. B. Rechnungen oder Kontoauszügen) ermittelt.

Grundsätzlich ist die Inventur zum Bilanzstichtag (= Ende des Geschäftsjahres) durchzuführen. Das muss aber nicht der 31.12. eines Kalenderjahres sein. Im Prinzip ist jedes Datum möglich, das jedoch beibehalten werden muss. Bei dieser sogenannten Stichtags- und zeitnahen Inventur erfolgt die Bestandsaufnahme am Bilanzstichtag oder innerhalb von 10 Tagen vor bzw. nach dem Bilanzstichtag. Dabei muss sichergestellt sein, dass die Bestandsveränderungen zwischen dem Bilanzstichtag und der Bestandsaufnahme berücksichtigt werden. Daneben besteht die Möglichkeit, die Inventur zeitlich verlegt durchzuführen. Dabei erfolgt die Bestandsaufnahme bis zu drei Monate vor oder bis zu zwei Monate nach dem Bilanzstichtag. Die Bestandsveränderungen zwischen dem Bilanzstichtag und dem Aufnahmetag müssen berücksichtigt werden. Bei der permanenten Inventur werden alle Zu- und Abgänge fortlaufend während des ganzen Jahres erfasst. Die Bestandsaufnahme erfolgt mit Hilfe von Lagerkarteien oder Warenwirtschaftssystemen. Mindestens einmal im Jahr muss eine körperliche Bestandsaufnahme durchgeführt werden, die aber zu einem beliebigen Zeitpunkt im Jahr erfolgen kann.
 
Die Inventur

Definition: 	Eine Inventur ist die Bestandsaufnahme aller Vermögensgegenstände und 
	Schulden eines Unternehmens zu einem bestimmten Zeitpunkt. 

1. Notwendigkeit einer Inventur
		1.	bei Gründung			3.	bei Auflösung
							
		2.	bei Übernahme			4.	bei Bilanzstichtag
							

2. Form der Inventur
		körperliche Inventur
		
		= körperliche Bestandsaufnahme aller Vermögensgegenstände durch
		schätzen	messen	wiegen	zählen
		Beispiele: Fuhrpark, Maschinen, Geschäftsausstattung, Bargeld, Waren
		Buchinventur
	
	= buchmäßige Bestandsaufnahme aller Vermögensgegenstände und Schulden anhand 
	von Belegen (Eingangsrechnungen, Ausgangsrechnungen, Kontoauszüge)
	Beispiele: Forderungen, Bankguthaben, Verbindlichkeiten, Darlehen

3. Zeitpunkt der Inventur
		1. Stichtags- und zeitnahen Inventur	Wenn die Inventur einige Tage vor oder nach dem Bilanzstichtag (max. 10 Tage) durchgeführt wird, müssen Bestandsveränderungen dieses Zeitraums anhand von Belegen dokumentiert und berücksichtigt werden. 
			
		Bilanzstichtag	
				31.12.			
								
				21.12.
10.01.			
						
		Zeitraum für Inventur	
			
		2. zeitlich verlegte Inventur	Die körperliche Inventur findet maximal 3 Monate vor oder 2 Monate nach dem Bilanzstichtag statt. Der bei der Inventur ermittelte Bestand wird zum Bilanzstichtag fortgeschrieben bzw. zurückgerechnet. 
			
		Bilanzstichtag	
				31.12.			
								
				01.10.
				28.02.			
						
		Zeitraum für Inventur	
			
		3. Permanente Inventur	Die Inventurarbeiten werden zeitlich auf das ganze Jahr verteilt. Einmal im Jahr muss zu einem beliebigen Zeitpunkt eine körperliche Bestandsaufnahme durchgeführt werden. 
			
		Bilanzstichtag	Kontrollinventur	Bilanzstichtag		
		31.12.	z.B. am 10.06.	31.12.		
									
								
					
		
		Zeitraum für Inventur		
				
Übungsaufgaben

Handlungsauftrag: 
Bearbeiten Sie die nachfolgenden Übungsaufgaben selbstständig. 

Aufgabe 1: Kreuzen Sie an, welche Aussage nur auf die permanente Inventur zutrifft. 

Aussagen
	Die Zählung der Warenbestände an einem Stichtag.
	Die Schätzung der Warenbestände zu einem bestimmten Zeitpunkt.
X	Die laufende Bestandsermittlung durch Erfassung der Zu- / Abgänge.
	Die Inventur an verschiedenen Tagen für verschiedene Warengruppen.
	Die Erfassung der Warenbestände nach der Reihenfolge, wie sie gelagert sind.

Aufgabe 2: Geben Sie an, ob folgende Aussagen zur Inventur richtig (= R) oder falsch (= F) sind. 

Aussagen
F	Die Inventur ist erforderlich zu Beginn des Handelsgewerbes und jeweils zum Halbjahresende und Jahresende eines Kalenderjahres.
R	Körperliche Wirtschaftsgüter werden durch Messen, Zählen, Wiegen und Schätzen inventarisiert (körperliche Inventur).
R	Nichtkörperliche Wirtschaftsgüter und Schulden weist man buchhalterisch nach (Buchinventur).
F	Die Inventur ist das Verzeichnis der Warenbestände zum Inventurstichtag.

 

Inventurliste
Station	Posten	Wert in EUR	V/S
# 1	660 g Muttern	33,00 EUR	
# 1	280 g Spanplatten-Schrauben	11,20 EUR	
# 1	430 g Sechskantschrauben	25,80 EUR	
# 2	9,5 m PVC-Flexrohre	21,85 EUR	
# 3	3 l reinigendes Schmieröl	108,15 EUR	
# 4	Kassenbestand	3.510,00 EUR	
# 5	5 DELL PCS	4.250,00 EUR	
# 5	3 Brother Drucker	2.250 EUR	
# 5	1 Mercedes Benz Sprinter	19.500,00 EUR	
# 5	1 Büro- und Geschäftsgebäude	479.500,00 EUR	
# 5	1 Skoda Octavia	22.000,00 EUR	
# 5	1 Kassensystem	35.000,00 EUR	
# 5	1 Grundstück Pfarrkirchen	80.000,00 EUR	
# 5	1 Grundstück Eggenfelden	120.000,00 EUR	
# 5	4 Hubwagen	2.800,00 EUR	
# 5	Warenbestand im Lager	102.620,00 EUR	
# 5	Warenbestand im Verkaufsraum	17.930,00 EUR	
# 5	Büromöbel	12.000,00 EUR	
# 5	Produktregale	6.000,00 EUR	
# 5	2 Surface Laptop	1.600,00 EUR	
# 6	Bankguthaben	88.599,53 EUR	
# 6	Forderung K. B. Lichttechnik	483,00 EUR	
# 6	Forderung Ristorante Bella Italia	161,00 EUR	
# 6	Darlehen Sparkasse	418.800,00 EUR	
# 6	Hypothek Sparkasse	230.000,00 EUR	
# 6	Überziehungskredit VR-Bank	1.200,00 EUR	
# 6	Verbindlichkeiten IT BIC Großhändler	10.000,00 EUR	
# 6	Verbindlichkeiten Schreinerei Kökerbauer	5.600,00 EUR	


Das Inventar

Handlungsaufträge: 
1.	Lesen Sie den nachfolgenden Informationstext aufmerksam durch und markieren Sie wichtige Inhalte den Eigenheiten eines Inventars. 
2.	Bringen Sie anhand der Informationen gemeinsam mit Ihrem Banknachbarn die Schnipsel auf der Übersicht in eine logische Reihenfolge. 

Nachdem man die Inventur gemacht hat, erstellt man daraus das Inventar. Das Inventar ist ein genaues und ausführliches Bestandsverzeichnis aller Vermögensgegenstände und Schulden eines Unternehmens und weist diese aus nach Art, Menge und Wert und summiert die Einzelposten. Das Inventar ist gemäß § 240 Abs. 1 HGB von jedem Kaufmann zu Beginn seines Handelsgewerbes und zum Schluss eines jeden Geschäftsjahres sowie bei Geschäftsaufgabe aufzustellen. Inventare unterliegen ebenso wie Bilanzen und andere Geschäftsunterlagen der gesetzlichen Aufbewahrungspflicht von 10 Jahren zum Ende des Geschäftsjahres. Das Inventar besteht dabei aus drei Teilen: dem Vermögen, den Schulden und dem Eigenkapital.

Das Vermögen gibt Aufschluss darüber, welche Gegenstände in einem Unternehmen vorhanden sind. Die Vermögensposten werden im Allgemeinen in Anlehnung an die gesetzlichen Vorschriften über die Gliederung der Bilanz nach dem Prinzip steigender Liquidität (= Flüssigkeit/ Zahlungsfähigkeit) geordnet, d.h. danach, wie schnell ein Vermögensposten beim normalen Betriebsablauf zu Geld gemacht werden kann. Am wenigsten „flüssig“ sind Grundstücke und Gebäude, mehr „flüssig“ ist z.B. ein leicht verkäuflicher Personenkraftwagen, voll „flüssig“ ist das Bargeld in der Geschäftskasse. Man unterscheidet dabei zwischen Anlagevermögen und Umlaufvermögen: 
–	Zum Anlagevermögen gehören alle Vermögensposten, die dazu bestimmt sind, dem Unternehmen langfristig zu dienen. Sie bilden die Grundlage für die Betriebsbereitschaft
–	Zum Umlaufvermögen zählen alle Vermögensposten, die dadurch charakterisiert sind, dass sie sich durch die Geschäftstätigkeit laufend verändern 

Die Schulden (Verbindlichkeiten) gliedert man in langfristige und kurzfristige Schulden. Man ordnet sie nach ihrer Fälligkeit zur Rückzahlung (Tilgung), d.h. genauer gesagt, nach dem Prinzip der zunehmenden Fälligkeit:
–	Zu den langfristigen Schulden (Laufzeit > 1 Jahr) gehören beispielsweise Hypothekenschulden und Darlehen. 
–	Kurzfristige Bankschulden (z. B. Überziehungskredit), Verbindlichkeiten gegenüber Lieferern aber auch Schulden bei der Bank werden zu den kurzfristigen Schulden gezählt. 

Zieht man vom Gesamtwert des Vermögens den Gegenwert der Schulden ab, erhält man das Eigenkapital. Es stellt den gedachten Eigentumsanteil des Eigentümers an seinem Betrieb dar.
 
	
Hilfestellung zur Gliederung und zum 
Aufbau des Inventars

Das Vermögen lässt sich in zwei Bereiche unterteilen, das Anlage- und Umlaufvermögen. Dabei stellt das Anlagevermögen das langfristig in einem Unternehmen genutzte Vermögen dar, welches die Betriebsbereitschaft sichert, während das Umlaufvermögen nur relativ kurzfristig im Unternehmen gebunden ist. Achten Sie bei der Strukturlegetechnik daher auf das Prinzip der zunehmenden Liquidität. Das heißt, je länger Vermögen im Unternehmen gebunden ist, desto weiter steht es im Inventar oben, je schneller es hingegen zu Bargeld gemacht werden kann, desto weiter unten im Inventar steht es. 

Die Schulden lassen sich ebenfalls in zwei Bereiche unterteilen: die langfristigen und kurzfristigen Schulden. Von langfristigen Schulden spricht man bei einer Laufzeit von mehr als einem halben Jahr, kurzfristige Schulden sind solche, die ein Unternehmen kurzfristig aufnimmt, schnell jedoch wieder zurückbezahlt. Zu beachten ist dabei das Prinzip der zunehmenden Fälligkeit, das bedeutet, dass Schulden, die langfristig in einem Unternehmen auffindbar sind, weiter oben im Inventar stehen, kurzfristige Schulden hingegen unten.
Inventarerstellung bei der CWE

Handlungsauftrag: 
Erstellen Sie das Inventar aus der kürzlich angefertigten Dokumentation der Inventur für die CenterWarenhaus GmbH Eggenfelden. 


Aufstellung des Inventars

	Einzelwert in €	Gesamtwert in €
A. Vermögen		
	I. Anlagevermögen		
		1. Grundstück		200.000,00
		–	Grundstück Eggenfelden	120.000,00	
		–	Grundstück Pfarrkirchen	80.000,00	
		2. Gebäude		479.500,00
		3. Maschinen 		2.800,00
		–	4x Hubwagen	2.800,00	
		4. Fuhrpark		41.500,00
		–	1x Mercedes Benz	19.500,00	
		–	1x Skoda Octavia	22.000,00 	
		5. Betriebs- und Geschäftsausstattung		61.100,00
		–	Kassensystem	35.000,00	
		–	Produktregale	6.000,00	
		–	Büromöbel	12.000,00	
		–	2x Laptop	1.600,00	
		–	5x PC	4.250,00	
		–	3x Drucker	2.250,00	
	II. Umlaufvermögen		
		1. Roh-, Hilfs- und Betriebsstoffe		200,00
		–	Flexrohr	21,85	
		–	Sechskantschrauben	25,80	
		–	Sechskantmuttern	33,00	
		–	Spanplattenschrauben	11,20	
		–	Schmieröl	108,15	
		2. Warenbestände 		120.550,00
		–	im Verkaufsraum	17.930,00 	
		–	Im Lager	102.620,00	
		3. Forderungen		644,00
		–	Ristorante Bella Italia	161,00	
		–	K.B. Lichttechnik	483,00	
		4. Bankguthaben		88.599,53
		5. Kassenbestand		3.510,00
= Summe des Vermögens		998.403,53
B. Schulden		
	I. langfristige Schulden		
		1. Hypothek		230.000,00
		2. Darlehen		418.800,00 
	II. kurzfristige Schulden		
		1. Verbindlichkeiten		15.600,00
		–	VLL Kökerbauer	5.600,00	
		–	VLL IT-BIC	10.000,00	
		2. Überziehungskredit		1.200,00
= Summe der Schulden		665.600,00
C. Eigenkapital		
+ Summe des Vermögens		998.403,53
– Summe der Schulden		665.600,00
= Eigenkapital		332.803,53
Eggenfelden, 13.12.2021
Ort, Datum	Unterschrift Bevollmächtigte/r


 
Übungsaufgaben

Handlungsauftrag: 
Bearbeiten Sie die nachfolgenden Übungsaufgaben selbstständig gemäß den angegebenen Aufgabenstellungen. 

Aufgabe 1: Geben Sie an, welche der folgenden Positionen zum Anlagevermögen (AV) und welche zum Umlaufvermögen (UV) zählen. 

Position	Einordnung
a)	Bankguthaben 	UV
b)	Geschäftsausstattung 	AV
c)	Kassenbestand 	UV
d)	Warenvorräte 	UV
e)	Grundstücke	AV
f)	Forderungen gegenüber der Firma Meyer	UV
g)	Rohstoffe 	UV

Aufgabe 2: Geben Sie an, welche der folgenden Schulden zu den langfristigen (LS) und welche zu den kurzfristigen Schulden (KS) zählen. 

Position	Einordnung
a)	Hypothekenschulden gegenüber einer Bank 	LS
b)	Verbindlichkeiten gegenüber dem Finanzamt 	KS
c)	Verbindlichkeiten gegenüber der Firma Mauerer 	KS
d)	Forderungen gegenüber der Firma Heller	Keine Schulden

Aufgabe 3: Kreuzen Sie an, was man unter einer „Inventur“ versteht. 

a)		Die Bewertung der Warenvorräte.
b)		Ein ausführliches Bestandsverzeichnis aller Vermögensteile und Schulden.
c)		Die mengen- und wertmäßige Bestandsaufnahme aller Vermögensteile und Schulden.

Aufgabe 4: Kreuzen Sie an, was man buchhalterisch unter einem „Inventar“ versteht. 

a)		Ein ausführliches Verzeichnis aller Vermögensteile und Schulden nach Art, Menge und Wert.
b)		Einen anderen Ausdruck für „Inventur“.
c)		Die Betriebs- und Geschäftsausstattung.
d)		Die Bestandsaufnahme aller Vermögensteile und Schulden nach Art, Menge und Wert.

Aufgabe 5: Ordnen Sie die angegebenen Positionen durch Ankreuzen richtig zu.

Positionen	Anlage-	Umlauf-	langfristige	kurzfristige
	-vermögen	Schulden
Bargeld (Kasse)		X		
Grundstück mit Geschäftshaus	X			
Fuhrpark	X			
Darlehensschulden			X	
Unbebaute Grundstücke	X			
Hypothekenschulden			X	
Verbindlichkeiten an Lieferanten				X
Forderungen		X		
Waren		X		
Guthaben bei Kreditinstituten		X		
Maschinen	X			

Aufgabe 6: Entscheiden Sie durch Ankreuzen, ob folgende Aussagen wahr oder falsch sind.


Wahr	Falsch
Das Vermögen gliedert man in langfristige und kurzfristige Schulden.		X
Die Schulden werden im Inventar nach ihrer Fälligkeit geordnet.	X	
Ein Inventar besteht aus zwei Teilen: dem Vermögen und den Schulden. 		X
Zu den langfristigen Schulden gehören auch Verbindlichkeiten gegenüber Lieferern. 		X
Die Summe des Vermögens wird auch als Eigenkapital bezeichnet. 		X
Die Vermögensposten werden nach dem Prinzip steigender Liquidität geordnet.	X	

Die Bilanz

Handlungsaufträge: 
1.	Lesen Sie den nachfolgenden Informationstext aufmerksam durch und markieren Sie wichtige Inhalte zur Eigenheit einer Bilanz. 
2.	Stellen Sie anhand des Inventars die Bilanz für die CWE zum 31.12. auf. 

Nach § 242 HGB hat jeder Kaufmann zu Beginn seines Handelsgewerbes und für den Schluss eines jeden Geschäftsjahres neben dem Inventar auch eine Bilanz (ital. „bilancia“ = Waage) zu erstellen, in der sein Vermögen und seine Schulden dargestellt werden. Während dabei das Inventar ein Bestandsverzeichnis aller Vermögensteile und Schulden nach Art, Menge und Wert in Staffelform ist, versteht man unter einer Bilanz eine wertmäßige Bestandsübersicht in Form einer Gegenüberstellung von Vermögen und Kapital in einem sogenannten T-Konto. Hintergrund ist, dass in der Bilanz auf jede mengenmäßige Darstellung des Vermögens und der Schulden verzichtet wird, sondern lediglich die Gesamtwerte gleichartiger Posten (z. B. den Gesamtwert der Waren) enthält. 

Auf der linken Seite („Aktiva“) ist das Vermögen dargestellt. Es umfasst alle Güter und Rechte, die dem Einzelhändler zum Wirtschaften zur Verfügung stehen, Geschäftsausstattung, Fahrzeuge, Waren, Forderungen (gegenüber Kunden), Bankguthaben, Bargeld, usw. 
Vermögen, das dem Betrieb länger als 1 Jahr zur Verfügung steht, nennt man Anlagevermögen. Bleibt das Vermögen kürzer (unter 1 Jahr) im Unternehmen, spricht man von Umlaufvermögen. Auf der rechten Bilanzseite („Passiva“) steht das Kapital. Darunter versteht man alle Mittel/Gelder, die der Unternehmer zum Kauf des Vermögens benötigt. Man unterscheidet zwischen Eigenkapital (dieses bringt der Unternehmer selbst in den Betrieb ein) und Fremdkapital bzw. Schulden (diese Gelder wurden dem Unternehmer von Banken, Lieferanten usw. zur Verfügung gestellt).

Mithilfe einer Bilanz kann ein Unternehmen sehr einfach und schnell analysiert und beurteilt werden. Häufig spielt dabei eine Rolle, ob das Kapital überwiegend im Anlagevermögen oder im Umlaufvermögen angelegt wurde, ob das Unternehmen über genügend flüssige (liquide) Mittel verfügt, um die kurzfristigen Verbindlichkeiten auszugleichen und auch, ob das Unternehmen überwiegend mit eigenen oder fremden Mitteln arbeitet. 

Die Bilanz einer Unternehmung zeigt in übersichtlicher Form, woher einerseits das Kapital stammt bzw. wie das Vermögen finanziert (Eigen- und Fremdkapital) wurde und wie das Kapital andererseits angelegt bzw. verwendet wurde (Anlage- und Umlaufvermögen). Es gilt, dass die Summe des Vermögens (Aktivseite/Aktiva) gleich der Summe des Kapitals (Passivseite/Passiva) ist. Diese Gegebenheit nennt man Bilanzgleichung. Außerdem ist die Bilanz mit Datum zu versehen und darf nur vom Geschäftsinhaber persönlich unterschrieben werden.


  Gliederung und Aufbau der Bilanz

Inventur = 	Bestandsaufnahme aller Vermögenswerte und Schulden nach Menge und Wert (wiegen, messen, zählen, schätzen)



Inventar = 	Ausführliches Bestandsverzeichnis aller Vermögensteile und Schulden nach Art, Menge und Wert in Staffelform (Pflicht zur Aufstellung nach § 240 HGB, Aufbewahrungspflicht für 10 Jahre)



Bilanz =	wertmäßige Bestandsübersicht in Form einer Gegenüberstellung des gesamten Vermögens und des Kapitals in einem T-Konto (Pflicht zur Aufstellung nach § 242 HGB, Aufbewahrungspflicht für 10 Jahre)


Aktiva (Vermögen)	Bilanz zum 31.12.	 (Kapital) Passiva
A. Anlagevermögen
	A. Eigenkapital	332.803,53 EUR
	1. Grundstück	200.000,00 EUR	B. Fremdkapital	
	2. Gebäude	479.500,00 EUR		1. Hypothek	230.000,00 EUR
	3. Maschinen 	2.800,00 EUR		2. Darlehen	418.800,00 EUR 
	4. Fuhrpark	41.500,00 EUR		3. Verbindlichkeiten 	15.600,00 EUR
	5. BGA	61.100,00 EUR		4. Überziehungskredit	1.200,00 EUR
B. Umlaufvermögen				
	1. Betriebsstoffe	200,00 EUR			
	2. Warenbestände 	120.550,00 EUR			
	3. Forderungen 	644,00 EUR			
	4. Bankguthaben	88.599,53 EUR			
	5. Kassenbestand	3.510,00 EUR			
		998.403,53 EUR		998.403,53 EUR

Aktiva = 
Mittelverwendung	beide Seiten müssen 
gleich groß sein!	Passiva = 
Mittelherkunft

Bilanzformeln
Vermögen	=	Eigenkapital + Fremdkapital
Anlagevermögen + Umlaufvermögen	=	Eigenkapital + Fremdkapital
Eigenkapital	=	Vermögen - Fremdkapital

 
Übungsaufgaben

Handlungsauftrag:
Bearbeiten Sie selbstständig die nachfolgenden Übungsaufgaben.

Aufgabe 1: Geben Sie die richtigen Begriffe zu den angegebenen Erklärungen an. 

Begriff	Erklärung
Eigenkapital	Kapital, das der Unternehmer selbst in den Betrieb einbringt.
Umlaufvermögen	Vermögen, das kürzer (unter 1 Jahr) im Unternehmen bleibt.
Passiva	Diese Seite der Bilanz weist aus, woher das Geld zum Kauf des Vermögens stammt.
Bilanz	Gegenüberstellung des Vermögens und des Eigen- und Fremdkapitals eines Unternehmers in Kontoform.

Aufgabe 2: Ordnen Sie folgende Werte und Gegenstände den korrekten Bilanzposten zu.

Position	Anlage-vermögen	Umlauf-vermögen	Eigen-kapital	Fremd-kapital
Ladeneinrichtung	X			
Lieferantenverbindlichkeit				X
Kassenbestand		X		
Warenbestände		X		
Langfristiger Bankkredit				X

Aufgabe 3: Erklären Sie in ganzen Sätzen, wann der Einzelhändler eine Bilanz erstellen muss und für welchen Zeitraum / Zeitpunkt die Bilanz gültig ist. 
Eine Bilanz ist bei Geschäftseröffnung und zum Schluss eines jeden Geschäftsjahres zu 
erstellen. Sie gilt immer nur für einen bestimmten Zeitpunkt, da sich durch Geschäftsfälle die 
Positionen ständig ändern.





 
Aufgabe 4: Die Bilanzsumme eines Einzelhandelsunternehmens beträgt 12.000.000,00 €. Das Eigenkapital beträgt 35 % der Bilanzsumme, das Umlaufvermögen 70 % der Bilanzsumme.
Berechnen Sie die Höhe
a)	des Fremdkapitals in Euro
EK + FK =12.000.000,00; 
FK = 0,65 * 12.000.000,00 = 7.800.000,00 €

b)	des Anlagevermögens in Euro.
AV + UV = =12.000.000,00; 
AV = 0,30  * 12.000.000,00€ = 3.600.000,00 €

Aufgabe 5: Die Bilanz eines Einzelhandelsunternehmens weist zum Schluss des Geschäftsjahres folgende Werte aus.

Aktiva (Vermögen)	Bilanz zum 31.12.	 (Kapital) Passiva
Fuhrpark	140.000,00	Eigenkapital	
Geschäftsausstattung 	230.000,00	Darlehen	310.600,00
Warenbestände	520.500,00	Verbindlichkeiten	80.900,00
Forderungen	10.700,00			
Bankguthaben	98.500,00			
Kassenbestand	3.900,00			
					
Ermitteln Sie
a)	die Bilanzsumme,
1.003.600,00 €

b)	die Höhe des Eigenkapitals in Euro und in Prozent am Gesamtkapital sowie
EK = 612.100,00 €, Anteil = 60,99 %

c)	das Umlaufvermögen in Euro und in Prozent am Gesamtvermögen.
UV = 633.600,00 €, Anteil = 63,13 %

 
Bilanzveränderungen

Handlungsauftrag:
Lesen Sie den nachfolgenden Informationstext aufmerksam durch und markieren Sie wichtige Inhalte zu den Aspekten einer Bilanzveränderung. 

Die Bilanz ist eine Aufstellung des Vermögens und der Schulden zu einem bestimmten Zeitpunkt. Im Prinzip stellt eine Bilanz dadurch ein Foto dar, das man am Bilanzstichtag vom Unternehmen schießt. Durch die Geschäftstätigkeit werden die Vermögens- und Kapitalbestände jedoch laufend verändert. Damit ändern sich die Bestände einzelner Positionen. Alle Geschäftsprozesse, die zu einer Änderung einzelner Vermögensposten bzw. Kapitalposten führen, werden in der Buchführungssprache als Geschäftsfälle bezeichnet. Belege dokumentieren diese Geschäftsfälle. Das bedeutet, sie beschreiben den geschäftlichen Vorgang und dienen gleichzeitig als Beweis.

Die Buchhaltung muss alle in den Belegen aufgezeigten Vermögensänderungen lückenlos und zeitnah erfassen. Umgekehrt sind die Belege lückenlos und geordnet zum Nachweis der ordnungsmäßigen Buchführung aufzubewahren. Dazu herangezogen wird das Prinzip der doppelten Buchführung, auch Doppik genannt. Aus der Buchführung können dadurch zu jeder Zeit während des Geschäftsjahres Buchbestände (Soll-Bestände) an Vermögen und Kapital abgerufen werden. Ob diese Soll-Bestände tatsächlich vorhanden sind, wird üblicherweise jährlich über die Inventur festgestellt. 

Beginn des Geschäftsjahres		Während des Geschäftsjahres		Ende des Geschäftsjahres
				
Bilanz zum Schluss des Vorjahres laut Inventur		Erfassung der Veränder-ungen durch Geschäftsfälle		Ermittlung der Ist-Bestände durch eine Inventur

Das Besondere an der doppelten Buchführung ist die doppelte Kontrolle der Bestände und der alljährliche Abgleich der Soll- und Ist-Bestände. 

Doppelte Buchführung

			

	Andauernde Fortschreibung der Anfangsbestände in Konten				Jährliche Ermittlung der Endbestände durch Inventur	
				
Soll-Bestand zum Ende des Geschäftsjahres
	= Anpassung Soll-Bestand an den Ist-Bestand	Ist-Bestand zum Ende des Geschäftsjahres

	Abgleich	

	


Grundsätzlich lassen sich in der Bilanz vier strukturell unterschiedliche Wertebewegungen unterscheiden: der Aktivtausch, der Passivtausch, die Aktiv-Passiv-Mehrung und die Aktiv-Passiv-Minderung. 
Handlungsaufträge: 
1.	Geben Sie an, welcher Geschäftsfall hinter den jeweiligen Belegen steckt. 
2.	Nennen Sie die beiden jeweils betroffenen Bilanzpositionen bzw. Konten.
3.	Erklären Sie, wie sich Aktiv- und/oder die Passivseite der Bilanz ändert. 
4.	Überlegen Sie, wie sich durch den Geschäftsfall die Bilanzsumme ändert. 
5.	Ordnen Sie den Geschäftsfall einem der vier nachfolgenden Bilanzveränderungen zu. 

#1:	Aktivtausch	Ein Aktivposten wird vermehrt, ein anderer Aktivposten wird um den gleichen Betrag gemindert. Die Bilanzsumme bleibt unverändert
		
#2:	Passivtausch	Ein Passivposten wird vermehrt, ein anderer Passivposten wird um den gleichen Betrag gemindert. Die Bilanzsumme bleibt unverändert.
		
#3:	Aktiv-Passiv-Mehrung	Ein Aktiv- und ein Passivposten nehmen um den gleichen Betrag zu. Die Bilanzsumme erhöht sich um den gleichen Betrag.
		
#4:	Aktiv-Passiv-Minderung	Ein Aktiv- und ein Passivposten nehmen um den gleichen Betrag ab. Die Bilanzsumme verringert sich um den gleichen Betrag.

  Merke:	Die Bilanz ist eine Abschlussrechnung, die den Stand des Vermögens und des Kapitals zu einem bestimmten Zeitpunkt angibt. Diese einmal festgestellten Werte unterliegen durch die Geschäftstätigkeit einer laufenden Veränderung. Geschäftsfälle bewirken, dass sich die Größe und Zusammensetzung von Vermögen und Kapital ständig verändern und somit theoretisch auch die Bilanz. Entsprechend dem Wesen der Bilanz muss dabei die Bilanzgleichung immer erhalten bleiben, d. h., die Bilanz muss immer im Gleichgewicht sein. Das bedeutet: Wenn wir auf der einen Seite der Bilanz etwas wegnehmen, müssen wir auf der anderen Seite auch etwas wegnehmen oder umgekehrt. So ruft jeder Geschäftsvorfall in doppelter Hinsicht eine Veränderung hervor. Dabei können vier verschiedene Bilanzveränderungen unterschieden werden.

Aktivtausch	Passivtausch	Aktiv-Passiv-Mehrung	Aktiv-Passiv-Minderung
Bei einem Aktivtausch sind nur zwei Posten auf der Aktivseite betroffen. Ein Posten nimmt ab, ein anderer nimmt um den gleichen Betrag zu. Veränderungen finden nur auf der Aktivseite statt. 	Bei einem Passivtausch sind nur zwei Posten auf der Passivseite betroffen. Ein Posten nimmt ab, ein anderer nimmt um den gleichen Betrag zu. Veränderungen finden nur auf der Passivseite statt.	Bei einer Aktiv-Passiv-Mehrung sind jeweils eine Position auf der Aktiv- und eine Position auf der Passivseite betroffen. Beide Seiten nehmen um den gleichen Betrag zu.	Bei einer Aktiv-Passiv-Minderung sind jeweils eine Position auf der Aktiv- und eine Position auf der Passivseite betroffen. Beide Seiten nehmen um den gleichen Betrag ab.

  Auflösung der Bilanz in Konten

Handlungsauftrag: 
Lesen Sie den nachfolgenden Informationstext aufmerksam durch und markieren Sie wichtige Inhalte zur Auflösung der Bilanz in Konten. 


S	Kasse	H
	
	
 
 Wie das Inventar wird die Bilanz nur zu einem bestimmten Stichtag erstellt. Nach jedem Geschäftsvorfall eine neue Bilanz zu erstellen, wäre bei der Menge der Fälle völlig unpraktisch. Deshalb löst man die Bilanz zu Beginn eines Geschäftsjahres in T-Konten auf, so dass es für jeden Bilanzposten ein eigenes Konto gibt, in dem die Geschäftsfälle erfasst werden können. Nach den Seiten der Bilanz unterscheidet man
–	Aktivkonten (= Vermögenskonten)
–	Passivkonten (= Kapitalkonten)

Aktiv- und Passivkonten weisen im Einzelnen die Bestände an Vermögen (Aktiva) und Kapital (Passiva) des Unternehmens aus und erfassen die Veränderungen dieser Bestände aufgrund der Geschäftsfälle. Sie stellen daher sogenannte Bestandskonten dar. Bei sämtlichen Konten wird die linke (Aktiv-) Seite als „Soll“ (S) und die rechte (Passiv-) Seite als „Haben“ (H) bezeichnet. Zu Beginn eines Geschäftsjahres werden die Werte der einzelnen Bilanzposten in die entsprechenden Konten als Anfangsbestände übernommen.

Aktivkonten:			Passivkonten:
Die Anfangsbestände (AB) stehen in der 1. Zeile auf der Sollseite des Kontos.			Die Anfangsbestände (AB) stehen in der 1. Zeile auf der Habenseite des Kontos.
S	Aktivkonto	H
	
	
			S	Passivkonto	H
	
	

–	Zugänge (= Mehrungen) werden in Aktivkonten immer auf der Sollseite (der Seite des Anfangsbestandes) gebucht. 
–	Abgänge (= Minderungen) werden immer auf der Habenseite (dem Anfangsbestand gegenüber-liegenden Seite) gebucht.			–	Zugänge (= Mehrungen) werden in Passivkonten immer auf der Haben-seite (der Seite des Anfangsbestandes) gebucht. 
–	Abgänge (= Minderungen) werden immer auf der Sollseite (dem Anfangsbestand gegenüberliegenden Seite) gebucht.


Jeder Geschäftsfall wirkt sich auf zwei Bilanzposten aus, das heißt es wird immer doppelt gebucht, und zwar immer zuerst im Soll und danach im Haben. Dabei muss jeder Sollbuchung eine betragsmäßig gleich hohe Habenbuchung auf einem anderen Konto gegenüberstehen. Bei der Buchung ist immer das Gegenkonto anzugeben. Am Ende eines Geschäftsjahres werden die Konten abgeschlossen. Dazu wird der Schlussbestand (SB) eines jeden Kontos in die Schlussbilanz übernommen. Der Schlussbestand ist immer der Saldo (Unterschiedsbetrag) zwischen Soll und Haben. Den Saldo erhält man, indem man die Abgänge mit den Beträgen der Gegenseite saldiert. Anders formuliert: die Summe aus Anfangsbestand und Zugänge muss identisch sein mit der Summe aus Abgängen und Saldo. Falls sich beim Abschluss eines Kontos ein Leerraum ergibt, so muss auch dieser durch Schrägstriche (Buchhalternase) entwertet werden. 

Beispielaufgabe: 
Ihnen liegen folgende Bilanzwerte zum 31.12. vor:
Grundstücke 60.000,00 EUR, Forderungen 4.000,00 EUR, Darlehen 24.000,00 EUR, Verbindlichkeiten 11.500,00 EUR, Kasse 5.500,00 EUR
1.	Erstellen Sie zunächst die Eröffnungsbilanz! 
2.	Eröffnen Sie anschließend zu jedem Bilanzposten ein Konto und tragen Sie die Anfangsbestände ein.
3.	Verbuchen Sie dann folgenden Geschäftsfall in den entsprechenden Konten: 
„Wir zahlen eine offene Rechnung bar in Höhe von 1.100,00 EUR.“
4.	Schließen Sie anschließend die Konten ab, indem Sie die Schlussbestände von jedem Konto ermitteln und erstellen Sie anschließend die Schlussbilanz.

Hinweis: Bevor Sie mit dem Buchen in den Konten beginnen, beachten Sie die Vorüberlegungen, die bei jeder Buchung von Geschäftsfällen in Konten notwendig sind:

Vorüberlegungen zur Buchung in Bestandskonten
1.	Berührte Konten		
			
2.	Bestimmung der Kontenart		
			
3.	Art der Bestandsveränderung		
			
4.	Betroffene Kontoseite		
			

Aktiva	Eröffnungsbilanz zum 01.01.	Passiva
Grundstücke	60.000,00 EUR	Eigenkapital	34.000,00 EUR
Forderungen	4.000,00 EUR	Darlehen	24.000,00 EUR
Kasse	5.500,00 EUR	Verbindlichkeiten	11.500,00 EUR
		69.500,00 EUR			69.500,00 EUR



S	Grundstücke	H		S	Eigenkapital	H
AB	60.000,00 	SB	60.000,00		SB	34.000,00	AB	34.000,00 
				
				
				
S	Forderungen	H		S	Darlehen	H
AB	4.000,00 	AB	4.000,00		SB	24.000,00 	AB	24.000,00 
				
				
						
S	Kasse	H		S	Verbindlichkeiten	H
AB	5.500,00 	VE	1.100,00		KA	1.100,00	AB	11.500,00 
			SB		4.400,00		SB	10.400,00			
		5.500,00			5.500,00				11.500,00			11.500,00



Aktiva	Schlussbilanz zum 31.12.	Passiva
Grundstücke	60.000,00 EUR	Eigenkapital	34.000,00 EUR
Forderungen	4.000,00 EUR	Darlehen	24.000,00 EUR
Kasse	4.400,00 EUR	Verbindlichkeiten	10.400,00 EUR
		68.400,00 EUR			68.400,00 EUR

 

Handlungsauftrag:
Bei der CWE ergab sich zum 31.12. des letzten Jahres und damit zum 01.01. dieses Jahres folgende Bilanz. 
1.	Lösen Sie die Eröffnungsbilanz auf, indem Sie die den einzelnen Bilanzpositionen zugehörigen Konten eröffnen.
2.	Buchen Sie die Belege #1 bis #4 sowie die angegebenen Geschäftsfälle. 
3.	Schließen Sie die Konten ab und erstellen Sie zum 31.12. die Schlussbilanz. 


 

Aktiva	Eröffnungsbilanz zum 01.01.	Passiva
A. Anlagevermögen		A. Eigenkapital	332.803,53 EUR
	1. Grundstück	200.000,00 EUR	B. Fremdkapital	
	2. Gebäude	479.500,00 EUR		I. lfr. Schulden	
	3. Maschinen 	2.800,00 EUR		   1. Hypothek	230.000,00 EUR
	4. Fuhrpark	41.500,00 EUR		   2. Darlehen	418.800,00 EUR 
	5. BGA	61.100,00 EUR		II. kfr. Schulden	
B. Umlaufvermögen			   3. Verbindlichkeiten 	15.600,00 EUR	
	1. Betriebsstoffe	200,00 EUR		   4. Überziehungskredit	1.200,00 EUR
	2. Warenbestände 	120.550,00 EUR			
	3. Forderungen 	644,00 EUR			
	4. Bankguthaben	88.599,53 EUR			
	5. Kassenbestand		3.510,00 EUR			
			998.403,53 EUR			998.403,53 EUR




S	Grundstücke	H		S	Gebäude	H
AB		200.000,00	SB		200.000,00		AB		479.500,00	SB		479.500,00
												
												
												
												


												
S	Maschinen	H		S	Fuhrpark	H
AB		2.800,00	SB		2.800,00		AB		41.500,00	8.		1.680,00
										SB		39.820,00
									41.500,00			41.500,00
												
												
												
S	BGA	H		S	Betriebsstoffe	H
AB		61.100,00	SB		62.600,00		AB		200,00	SB		200,00
1.		1.500,00										
		62.600,00			62.600,00							
												
												
S	Warenbestände	H		S	Forderung	H
AB		120.550,00	5.		1.200,00		AB		644,00	7.		180,00
3.		461,00	SB		119.811,00		5.		1.200,00	SB		1.664,00
		121.011,00			121.011,00				1.844,00			1.844,00
												
												
												
S	Bankguthaben	H		S	Kassenbestand	H
AB		88.599,53	4.		4.500,00		AB		3.510,00	1.		1.500,00
7.		180,00	6.		2.200,00		8.		1.680,00	SB		3.690,00
			SB		82.079,53				5.190,00			5.190,00
		88.779,53			88.779,53							
												
												
S	Eigenkapital	H		S	Hypothek	H
SB		332.803,53	AB		332.803,53		6.		2.200,00	AB		230.000,00
							SB		227.800,00			
									230.000,00			230.000,00
												
												
S	Darlehen	H		S	Verbindlichkeiten	H
SB		421.100,00	AB		418.800,00		2.		2.300,00	AB		15.600,00
			2.		2.200,00		4.		4.500,00	3.		461,00
		421.100,00			421.100,00		SB		9.261,00			
									16.061,00			16.061,00
												
S	2.	Überziehungskredit	H				
SB		1.200,00	AB		1.200,00							
												
												
												


Aktiva	Schlussbilanz zum 31.12.	Passiva
A. Anlagevermögen		A. Eigenkapital	332.803,53 EUR
	1. Grundstück	200.000,00 EUR	B. Fremdkapital	
	2. Gebäude	479.500,00 EUR		1. Hypothek	227.800,00 EUR
	3. Maschinen 	2.800,00 EUR		2. Darlehen	421.100,00 EUR 
	4. Fuhrpark	39.820,00 EUR		3. Verbindlichkeiten 	9.261,00 EUR
	5. BGA	62.600,00 EUR		4. Überziehungskredit	1.200,00 EUR
B. Umlaufvermögen				
	1. Betriebsstoffe	200,00 EUR			
	2. Warenbestände 	119.811,00 EUR			
	3. Forderungen 	1.664,00 EUR			
	4. Bankguthaben	82.079,53 EUR			
	5. Kassenbestand	3.690,00 EUR			
		992.164,53 EUR		992.164,53EUR

 
Übungsaufgaben

Handlungsauftrag:
Bearbeiten Sie selbstständig die nachfolgenden Übungsaufgaben. 

Aufgabe 1: Geben Sie an, auf welcher Kontenseite jeweils gebucht wird. 

Position	Kontenseite
a)	der Anfangsbestand bei
	1.		Fuhrpark	Soll
	2.		Forderungen	Soll
	3.		Bankguthaben	Soll
	4.		Darlehen	Haben
b)	ein Abgang bei
	5.		Verbindlichkeiten	Soll
	6.		Kasse	Haben
	7.		Bankguthaben	Haben
	8.		BGA	Haben
c)	ein Zugang bei
	9.		Eigenkapital	Haben
	10.		Grundstücke	Soll
	11.		Forderungen	Soll
	12.		Kasse	Soll

Aufgabe 2: Nummerieren Sie die nachfolgenden Aussagen in die richtige Reihenfolge (1 bis 5) in Hinblick auf den Abschluss von Konten. 

5	Falls sich ein Leerraum auf einer Kontenseite ergibt, so wird dieser durch einen Schrägstrich entwertet, die so genannte Buchhalternase.
2	Bei der Kontenseite mit der größeren Summe wird die Summe unten als Kontensumme eingetragen.
3	Die Kontensumme wird auf die andere Kontenseite übertragen.
1	Beide Kontenseiten werden in einer Nebenrechnung addiert.
4	Der Schlussbestand wird auf der anderen Kontenseite als Differenz (Saldo) ermittelt.

 
Die Erfolgsrechnung

Handlungsauftrag: 
Lesen Sie den Informationstext aufmerksam durch und markieren Sie wichtige Inhalte zu den Unterschieden der Bestandskontenbuchung und der Erfolgskontenbuchung. 

Die bisher gebuchten Geschäftsvorfälle waren stets erfolgsneutrale Geschäftsvorfälle. Sie berührten lediglich die Bestandskonten, wobei das Eigenkapital unverändert blieb. Ziel eines Unternehmens ist es aber, Gewinn zu erzielen, es kann aber auch passieren, dass ein Verlust erwirtschaftet wird. Geschäftsfälle, die einen Einfluss auf den Erfolg des Unternehmens haben, nennt man erfolgswirksame Geschäftsfälle. Erfolgswirksame Geschäftsfälle führen zu einer Minderung oder Mehrung des Eigenkapitals. Die Minderung des Eigenkapitals durch einen Geschäftsfall wird als Aufwand bezeichnet, die Mehrung des Eigenkapitals durch einen Geschäftsfall als Ertrag.

Aufwandskonten:			Ertragskonten:
Zahlungsausgänge, z.B. für:			Zahlungseingänge, z.B. für:
–	Löhne und Gehälter			–	Vermietung, Verpachtung
–	Ausgaben für Miete, Pacht, Leasing			–	Provisionen
–	Steuern, Beiträge			–	Zinserträge
–	Werbekosten, Reisekosten			
–	Instandhaltungskosten			
–	Verwaltungskosten, …			

Würden jedoch alle Aufwendungen und Erträge direkt auf dem Eigenkapitalkonto gebucht werden, so würde dieses Konto sehr umfangreich und unübersichtlich. Wegen der besseren Übersichtlichkeit werden die Minderungen des Eigenkapitals (Aufwendungen) und die Mehrungen des Eigenkapitals (Erträge) nicht direkt auf dem Eigenkapitalkonto gebucht. Stattdessen werden sogenannte Erfolgskonten als Unterkonten des Eigenkapitalskontos eingerichtet. Erfolgskonten werden unterteilt in Aufwands- und Ertragskonten. Für jede Aufwands- und Ertragsart wird ein gesondertes Konto eingerichtet. Auf den Erfolgskonten wird genauso gebucht, wie wenn direkt auf dem Eigenkapitalkonto gebucht würde. Allerdings haben die Erfolgskonten im Gegensatz zu den Bestandkonten keinen Anfangsbestand.

Aufwandskonten:			Ertragskonten:
Aufwendungen werden im Soll gebucht			Erträge werden im Haben gebucht
S	Aufwandskonto	H
+ Zugänge	Saldo
			S	Ertragskonto	H
Saldo	+ Zugänge


 
Buchung und Abschluss von Erfolgskonten

Handlungsauftrag: 
1.	Bilden Sie aus den angegebenen Geschäftsfällen die entsprechenden Buchungssätze und verbuchen Sie die Buchungssätze in den angegebenen Konten.
2.	Schließen Sie die Erfolgskonten ab und bilden Sie die Abschlussbuchungen. 

Geschäftsfälle: 	1.	Wir zahlen Gehälter in bar, 1.000,00 EUR. 
2.	Wir erhalten Mieteinnahmen in bar, 3.000,00 EUR.

1.	Gehälter	1.000,00	an	Kasse	1.000,00
2.	Kasse	3.000,00	an	Erlöse aus Vermietung	3.000,00

S	Kasse	H
AB		1.000,00	1.		1.000,00
2.		3.000,00 	SB		3.000,00
		4.000,00			4.000,00

S	Aufwendungen für Gehälter	H		S	Erlöse aus Vermietung	H
1. 		1.000,00	GuV		1.000,00		GuV		3.000,00	2.		3.000,00

Am Ende eines Geschäftsjahres wird der Erfolg (Gewinn oder Verlust) des Unternehmens durch die Gegenüberstellung aller Aufwendungen und Erträge ermittelt. Dazu schließt man die Erfolgskonten ab und überträgt die Salden zunächst auf ein sogenanntes Erfolgssammelkonto, das Konto » Gewinn und Verlust (GuV) «. Erst dieses Konto wird mit dem Saldo auf das Eigenkapitalkonto abgeschlossen. 

S	Gewinn und Verlust	H
AfG

1.000,00	EVV		3.000,00
EK		2.000,00 			
		3.000,00			3.000,00


S	Eigenkapital	H
SB		52.000,00	AB		50.000,00
			GuV		2.000,00
		52.000,00			52.000,00

Abschlussbuchungen: 
	GuV	1.000,00	an	Aufwendungen für Gehälter	1.000,00
	Erlöse aus Vermietung	3.000,00	an	GuV	3.000,00
	GuV	2.000,00	an	Eigenkapital	2.000,00

 
Übungsaufgaben

Handlungsaufträge: 
Bearbeiten Sie die nachfolgenden Aufgaben selbstständig. 

Aufgabe 1: Bearbeiten Sie die nachfolgenden Teilaufgaben. Ihnen ist dazu folgende Eröffnungsbilanz gegeben:

Aktiva 	Bilanz zum 01.01.	Passiva
Geschäftsausstattung	15.000,00	Eigenkapital	35.000,00
Waren	20.000,00	lfr. Bankverbindlichkeiten	8.000,00
Forderungen	5.000,00	Verbindlichkeiten a. L. L 	7.000,00
Bankguthaben	8.500,00			
Kassenbestand	1.500,00			
		50.000,00			50.000,00

a)	Berechnen Sie den Wert des Eigenkapitals und tragen Sie diesen in die oben abgebildete Bilanz ein. 
b)	Bilden Sie für die Geschäftsfälle jeweils die Buchungssätze. 

Buchungssätze: 
1.	BGA 	an 	VLL	1.800,00 €
2.	AfG 	an 	Bank	2.450,00 €
3.	Bank 	an 	FLL	1.200,00 €
4.	AfK 	an 	Bank	110,00 €
5.	Bank 	an 	Zinserträge (ZE)	187,50 €
6.	AfK 	an 	Kasse	50,00 €
7.	Kasse 	an 	FLL	700,00 €
8.	AfM 	an 	Bank	75,00 €
9.	AfK 	an 	Kasse	30,00 €
10.	AfK 	an 	Kasse	80,00 €
11.	AfZ 	an 	Bank	150,00 €
12.	VLL 	an 	sonst. Erlöse (SE)	1.000,00 €
13.	VLL 	an 	Bank	1.850,00 €
14.	lfr. Bankverbindlichkeiten 	an 	Bank	1.500,00 €




c)	Analysieren Sie die durch die Geschäftsfälle entstandenen Veränderungen und erstellen Sie die Schlussbilanz. 

Aktiva 	Bilanz zum 31.12.	Passiva
Geschäftsausstattung	16.800,00	Eigenkapital	33.242,50
Waren	20.000,00	lfr. Bankverbindlichkeiten	6.500,00
Forderungen	3.100,00	Verbindlichkeiten a. L. L 	5.950,00
Bankguthaben	3.752,50			
Kassenbestand	2.040,00			
		45.692,50			45.692,50

Anfangsbestand
+ Zugänge
- Abgänge
= Schlussbestand

Summe der Erträge
- Summe der Aufwendungen
= Gewinn/Verlust


d)	Geben Sie an, wie sich das Eigenkapital im Vergleich zur Ausgangssituation verändert (sowohl in Euro als auch in Prozent). 

	Eigenkapital alt	35.000,00 €
– 	Eigenkapital neu	33.242,50 €
= Veränderung	1.757,50 €

 Das Eigenkapital hat sich um 5,02142 % verringert. (Basiswert 35.000,00 EUR)

 
Aufgabe 2: Ein Einzelhandelsbetrieb hatte am Ende des Jahres 450.000,00€ Vermögen, 210.000,00€ Schulden. Im Laufe des Jahres entstanden 590.000,00€ Aufwendungen, 650.000,00€ Erträge. Ermitteln Sie
a)	das Eigenkapital am Ende des Jahres
b)	den Erfolg des abgelaufenen Jahres
c)	das Eigenkapital am Anfang des Jahres

a)	Vermögen 	450.000,00
- Schulden	210.000,00
EK am Ende des Jahres 	240.000,00

b)	Erträge	650.000,00
- Aufwendungen	590.000,00
Erfolg (Gewinn)	60.000,00

c)	EK am Ende des Jahres	240.000,00
- Gewinn	60.000,00
EK am Anfang des Jahres	180.000,00

Aufgabe 3: Ordnen Sie zu, welche der nachfolgenden Fakten auf die untenstehenden Aussagen zutreffen. Tragen Sie die entsprechende Ziffer in das Kästchen ein. 
a)	nur auf aktive Bestandskonten
b)	nur auf passive Bestandskonten
c)	auf alle Bestandskonten
d)	nur auf Aufwandskonten
e)	nur auf Ertragskonten
f)	auf alle Erfolgskonten

Aussagen	Ziffer
1.	Sie haben keinen Anfangsbestand.	f)
2.	Der Saldo steht im Haben und wird auf das GuV-Konto übertragen.	d)
3.	Auf diesen Konten werden Eigenkapitalmehrungen gebucht.	e)
4.	Der Anfangsbestand steht im Haben.	b)
5.	Es sind Unterkonten des Eigenkapitalkontos.	f)
6.	Auf diesen Konten werden Eigenkapitalminderungen erfasst	d)
7.	Der Saldo wird auf die Aktivseite der Schlussbilanz übertragen.	a)
8.	Sie erteilen Auskunft über Änderungen einzelner Vermögenspositionen.	a)
9.	Sie haben einen Endbestand.	c)
10.	Ihre Salden werden im Haben des GuV-Kontos gesammelt.	e)

Die Warenkonten

Ausgangssituation:
Zu Beginn des letzten Geschäftsjahres hat die Center Warenhaus GmbH in Eggenfelden 40 Mountainbikes der Marke Trailer auf Lager. Der Einkaufspreis pro Stück betrug 300,00 EUR

S	Warenbestand (WB)	H
AB		12.000,00	SB		30.600,00
AfW		18.600,00			
		30.600,00			30.600,00

Geschäftsfall 1: 
Für das Frühjahresgeschäft wurden weitere 100 Mountainbike der Marke Trailer zum selben Einkaufspreis von 300,00 EUR auf Ziel gekauft. Bilden Sie zu diesem Geschäftsfall den zugehörigen Buchungssatz und verbuchen Sie diesen in den entsprechenden Konten. 

AfW	30.000,00	an	VE	30.000,00

S	Aufwendungen für Waren (AfW)	H
1. 		30.000,00	WB		18.6000,00
			GuV		11.400,00
		30.000,00			30.000,00

 	Der Einkauf von Waren wird (zum Einstandspreis) auf dem Aufwandskonto Aufwendungen 
	für Waren (AfW) gebucht!

Geschäftsfall 2: 
Am ersten verkaufsoffenen Sonntag im Frühjahr wurden gleich 38 dieser Mountainbikes zu Verkaufspreis von 590,00 EUR bar verkauft. Bilden Sie zu diesem Geschäftsfall den zugehörigen Buchungssatz und verbuchen Sie diesen in den entsprechenden Konten. 

Kasse	22.420,00	an	UfW	22.420,00

S	Umsatzerlöse für Waren (UfW)	H
GuV		22.420,00	2.		22.420,00
					
					

 	Der Verkauf von Waren wird (zum Verkaufspreis) auf dem Ertragskonto Umsatzerlöse für
	Waren (UfW) gebucht!

Fortführung der Situation: 
Am Ende des Quartals will die CenterWarenhaus GmbH in Eggenfelden ermitteln, welchen Gewinn oder Verlust sie mit dem Verkauf der Mountainbikes erwirtschaftet hat. Schließen Sie dazu die Konten Warenbestand (WB), Aufwendungen für Waren (AfW) und Umsatzerlöse für Waren (UfW) ab und bilden Sie die entsprechenden Abschlussbuchungen. 

Vorgehen: 
1.	Schlussbestand:	= Anfangsbestand + Zugänge – Abgänge 
		= 40 Stück + 100 Stück – 38 Stück = 102 Stück 
		= 12.000 EUR + 30.000 EUR – 11.400 = 30.600 EUR
					
2. 	Änderung Warenbestand:	= SB in Euro/Stück – AB in Euro/Stück
		= 102 Stück – 40 Stück = 62 Stück (≜ Mehrung)
		= 30.600 EUR – 12.000 EUR = 18.600 EUR (≜ Mehrung)
					
3.	Ausgleich Warenbestand:	es wurde weniger verkauft als eingekauft, daher zu hohe 
		Aufwendungen, Ausgleich auf Aufwands- und 
		Bestandskonto notwendig

Abschlussbuchung für die Warenbestandsänderung: 
Warenbestand	18.600,00	an	AfW	18.600,00

Wareneinsatz
 	= verkaufte Ware, bewertet zum Einkaufspreis und damit der Saldo 
	(Differenzbetrag) auf dem Konto AfW, der auf das Konto GuV gebucht 
	wird
			
Rohergebnis
 	= Differenz aus Umsatzerlösen für Waren (UfW) und dem Wareneinsatz 
	und stellt Handelsspanne zwischen Nettoeinkaufs- und 
	Nettoverkaufspreisen dar

Berechnung des Rohergebnisses:
	Umsatzerlöse für Waren	22.420,00 EUR
–	Wareneinsatz	11.400,00 EUR
=	Rohgewinn	11.020,00 EUR

 

Hinweis: 
Alle nachfolgenden Geschäftsfälle beziehen sich auf das diesjährige Geschäftsjahr der CenterWarenhaus GmbH in Eggenfelden. 

S	Warenbestand (WB)	H
AB		30.600,00	SB		8.100,00
			AfW		22.500,00
		30.600,00			30.600,00

Geschäftsfall 3: 
Im zweiten Quartal werden weitere 95 Mountainbikes der Marke Trailer zum Preis von 590,00 EUR in bar verkauft. Eröffnen Sie die entsprechenden Konten, bilden Sie zu diesem Geschäftsfall den zugehörigen Buchungssatz und verbuchen Sie diesen in den entsprechenden Konten.

Kasse	56.050,00	an	UfW	56.050,00

S	Umsatzerlöse für Waren (UfW)	H
GuV		56.050,00	3.		56.050,00
					
					

Geschäftsfall 4: 
Um Verkaufsengpässe zu vermeiden, werden noch 20 weitere Mountainbikes zum Einstandspreis von 300,00 EUR auf Ziel dazugekauft. Bilden Sie zu diesem Geschäftsfall den zugehörigen Buchungssatz und verbuchen Sie diesen in den entsprechenden Konten.

AfW	6.000,00	an	VE	6.000,00

S	Aufwendungen für Waren (AfW)	H
4.		6.000,00	GuV		28.500,00
WB		22.500,00			
		28.500,00			28.500,00

Abschlussbuchung für die Warenbestandsänderung: 
AfW	22.500,00	an	WB	22.500,00

Berechnung des Rohergebnisses:
	Umsatzerlöse für Waren	56.050,00
–	Wareneinsatz	28.500,00
=	Rohgewinn	27.550,00



Wichtig ist, dass unterjährig keine Buchungen auf dem Warenbestandskonto erfolgen. Das ist ein Fehler in den Unterlagen. Warenein- und verkäufe werden lediglich auf den dafür vorgesehenen Erfolgskonten gebucht. Bestandsveränderungen auf dem Warenbestandskonto dann eben am Jahresende. "

};

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Fehlende messages (Array)" });
    }

    const payload = {
      model: "gpt-4o-mini",
      messages: [systemPrompt, ...messages],
      max_tokens: 800,
      temperature: 0.5
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("OpenAI Fehler:", resp.status, text);
      return res.status(502).json({ error: "Fehler beim OpenAI-Request", detail: text });
    }

    const data = await resp.json();
    const assistantMessage = data.choices?.[0]?.message ?? { role: "assistant", content: "" };
    res.json({ message: assistantMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Serverfehler", detail: String(err) });
  }
});

app.use(express.static(path.join(process.cwd(), "public")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
