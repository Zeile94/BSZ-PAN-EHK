/*
 * Leitet Anfragen an /api/vocabulary (Vokabelkatalog und Vokabelkarten)
 * an die Express-Anwendung in server.js weiter – genauso wie api/chat.js
 * es für /api/chat macht.
 */
import app from "../server.js";


export const config = {
  maxDuration: 120
};


export default app;
