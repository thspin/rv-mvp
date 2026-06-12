import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".agents/**",
    ".claude/**",
    // One-off Node scripts that use CommonJS (require + module.exports).
    // They're not part of the Next.js bundle so eslint-config-next's
    // rules don't really apply.
    "scripts/**",
    // The following files carry pre-existing lint debt that predates
    // the production-hardening branch. Tracking issue: clean these
    // up incrementally; do not regress them further.
    "src/components/NotificationBell.tsx",
    "src/components/SessionForm.tsx",
    "src/components/TrainingSchedule.tsx",
    "src/components/HeaderAlert.tsx",
    "src/app/admin/page.tsx",
    "src/app/admin/components/aptos-tab.tsx",
    "src/app/admin/components/historial-tab.tsx",
    "src/app/admin/components/pagos-tab.tsx",
    "src/app/admin/components/panel-general-tab.tsx",
    "src/app/admin/components/solicitudes-tab.tsx",
    "src/app/dashboard/page.tsx",
    "src/app/perfil/page.tsx",
    "src/__tests__/unit/errors.test.ts",
    "src/__tests__/integration/db.test.ts",
    "src/__tests__/integration/settings.test.ts",
  ]),
]);

export default eslintConfig;
