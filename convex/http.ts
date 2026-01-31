import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth routes
// CORS is avoided by using the Next.js API route proxy pattern
authComponent.registerRoutes(http, createAuth);

export default http;
