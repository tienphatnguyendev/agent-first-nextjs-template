module.exports = {
  forbidden: [
    {
      name: "no-app-private-module-imports",
      severity: "error",
      comment:
        "Repair: import the module through src/modules/<module>/index.ts.",
      from: { path: "(^|/)src/app(/|$)" },
      to: { path: "(^|/)src/modules/[^/]+/(?!index\\.[cm]?[jt]sx?$).+" },
    },
    {
      name: "no-private-cross-module-imports",
      severity: "error",
      comment: "Repair: import the other module through its public index.ts.",
      from: { path: "(^|/)src/modules/([^/]+)(/|$)" },
      to: {
        path: "(^|/)src/modules/[^/]+(/|$)",
        pathNot: [
          "(^|/)src/modules/$2(/|$)",
          "(^|/)src/modules/[^/]+/index\\.[cm]?[jt]sx?$",
        ],
      },
    },
    {
      name: "no-domain-framework-imports",
      severity: "error",
      comment: "Repair: pass plain values through an application interface.",
      from: { path: "(^|/)src/modules/[^/]+/domain(/|$)" },
      to: { path: "(^|node_modules/)(next|react|@prisma/client)(/|$)" },
    },
    {
      name: "no-domain-outer-layer-imports",
      severity: "error",
      comment: "Repair: make outer layers depend on domain, never the reverse.",
      from: { path: "(^|/)src/modules/[^/]+/domain(/|$)" },
      to: {
        path: "(^|/)src/modules/[^/]+/(application|infrastructure|ui)(/|$)",
      },
    },
    {
      name: "no-application-outer-layer-imports",
      severity: "error",
      comment:
        "Repair: define an interface in application and implement it in infrastructure.",
      from: { path: "(^|/)src/modules/[^/]+/application(/|$)" },
      to: {
        path: "(^|/)src/modules/[^/]+/(infrastructure|ui)(/|$)",
      },
    },
    {
      name: "no-shared-module-or-platform-imports",
      severity: "error",
      comment:
        "Repair: move this behavior into a module or explicit platform service.",
      from: { path: "(^|/)src/shared(/|$)" },
      to: { path: "(^|/)src/(modules|platform)(/|$)" },
    },
    {
      name: "no-client-server-imports",
      severity: "error",
      comment:
        "Repair: keep server access behind a server component, route, or action.",
      from: { path: "\\.client\\.[cm]?[jt]sx?$" },
      to: {
        path: "(^|/)src/platform/(database|env|logging)(/|$)",
        reachable: true,
      },
    },
    {
      name: "no-circular-dependencies",
      severity: "error",
      comment:
        "Repair: extract a one-way interface instead of keeping a cycle.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-unresolved-dependencies",
      severity: "error",
      comment: "Repair: correct the import path or declare the dependency.",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
  },
};
