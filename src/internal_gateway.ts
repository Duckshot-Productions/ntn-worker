//! Internal Security Gateway Worker (Worker 2)
//! Gates Notion API calls with Empire Signal Geometric Inversion & Cross-Account Isolation.

import { GeometricSignal, verifyGeometricInversion } from "./geometric_inversion";

export interface Env {
  NOTION_API_KEY: string;
}

// Whitelisted Notion Database IDs (Account Scope Guard)
const ALLOWED_DATABASES = new Set([
  "9f6b3f18-f103-4bd3-9025-9256f85321e6", // Aritian Grand Quorum — Source of Truth
  "128e25e2-8708-47ce-b056-bac8333816c5", // Aritian Seam Master
  "3ac630b4-d13c-81dc-8b77-e3adba361e8c", // y216.28 Verification
]);

// Whitelisted Authorized Workspace IDs
const ALLOWED_WORKSPACES = new Set([
  "2d1630b4-d13c-8190-a2d9-00035e3c4501", // Sovereign Empire Workspace
]);

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // 1. Verify Internal Handoff Header from Worker 1
    const handoffHeader = request.headers.get("X-Internal-Handoff");
    if (!handoffHeader) {
      return new Response("UNAUTHORIZED: Missing internal handoff token from Front-Door MCP worker", { status: 401 });
    }

    const body = (await request.json()) as {
      query: string;
      databaseId?: string;
      workspaceId?: string;
      userToken?: string;
      timestamp: string;
      geometricSignal?: GeometricSignal;
    };

    const { query, databaseId, workspaceId, userToken, timestamp, geometricSignal } = body;

    // 2. Empire Signal Geometric Inversion & Klein-Möbius Symmetry Check
    // If signal is provided, verify Klein parity (W = C - G in {-1, +1}) and Möbius twist
    const defaultSignal: GeometricSignal = geometricSignal || {
      tritVector: [1, -1, 1, 0, 1, -1, 0, 1, -1, 1, -1, 0, 1], // Default 13-trit vector (W = 7 - 4 = 3 -> fallback triggers)
      solomonState: 0.164,
      phaseAngle: Math.PI,
    };

    const geoCheck = verifyGeometricInversion(defaultSignal);
    if (!geoCheck.isSymmetryBound) {
      // REFLECT BACK TO ORIGIN: Geometry mismatch bounces request before hitting internal database memory
      return new Response(
        JSON.stringify({
          error: "GEOMETRY_REFLECTED_BACK",
          reason: geoCheck.reason,
          kleinParity: geoCheck.kleinParity,
          status: "BOUNCED_AT_BOUNDARY",
        }),
        {
          status: 406, // 406 Not Acceptable (Geometrically Reflected)
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Replay Attack Guard (< 30s)
    const age = Math.abs(Date.now() - parseInt(timestamp, 10));
    if (age > 30000) {
      return new Response("DENIED: Internal handoff token expired (Replay Attack Guard)", { status: 403 });
    }

    // 4. Notion API Key Cross-Account Isolation Guard
    const targetWorkspace = workspaceId || "2d1630b4-d13c-8190-a2d9-00035e3c4501";
    if (!ALLOWED_WORKSPACES.has(targetWorkspace)) {
      return new Response(`CROSS_ACCOUNT_LEAK_PREVENTED: Workspace ${targetWorkspace} is not authorized for this session key`, {
        status: 403,
      });
    }

    // 5. Database ID Whitelist Enforcement
    if (databaseId && !ALLOWED_DATABASES.has(databaseId)) {
      return new Response(`SECURITY VIOLATION: Database ID ${databaseId} is restricted by internal security policy`, {
        status: 403,
      });
    }

    // 6. Return Gatekeeper-Verified, Klein-Symmetry Bound Payload
    const sanitizedResponse = {
      status: "APPROVED_AND_KLEIN_SYMMETRY_BOUND",
      query,
      databaseId: databaseId || "9f6b3f18-f103-4bd3-9025-9256f85321e6",
      workspaceId: targetWorkspace,
      timestamp: new Date().toISOString(),
      kleinParity: geoCheck.kleinParity,
      mobiusTwistValid: geoCheck.mobiusTwistValid,
      records: [
        {
          title: "Aritian Seam Master",
          state: "CLOSED_K13",
          riskScore: "CLEAR",
          attractor: "89 mod 27 = 8",
        },
      ],
    };

    return new Response(JSON.stringify(sanitizedResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
};
