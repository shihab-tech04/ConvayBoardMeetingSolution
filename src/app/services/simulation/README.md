# Convay V7.1 isolated simulation runtime

An **opt-in**, browser-profile-local simulator used for synthetic acceptance fixtures. This is NOT Convay production authentication, SQL/RLS, private Storage, email/OTP or LiveKit. Never install this as the default `convayAuth` provider or migrate production users into these fixtures.

```ts
import { createIndexedDbSimulationRuntime, SIMULATION_CONFIRMATION } from "./ConvayRuntime";
const runtime = createIndexedDbSimulationRuntime({ confirmation: SIMULATION_CONFIRMATION });
await runtime.personaSignIn("sim-secretary-a", "tenant-a"); // synthetic persona only
const meetings = await runtime.list("meetings", "tenant-a");
```

Core controls: exactly one active designated root; root-only user/role/tenant/membership mutations; tenant boundary checks at each call; participant-scope meeting/document reads; optimistic revisions; idempotent mutations; append-only audit through this simulator API (not tamper-proof against local browser/devtools access); tenant-scoped root exports requiring reasons; denial of destructive offboarding until retention approval; explicit storage failure/retry; IndexedDB write compare-and-swap. `SIMULATION_CAPABILITIES.crossBrowserSync === false` — persistence is local to this browser profile. Run focused tests in `src/test/convay-simulation-runtime.test.ts`. Production SQL/RLS/Auth/Storage/media integration, authenticated E2E, and actual UI adapters remain UNVERIFIED.
