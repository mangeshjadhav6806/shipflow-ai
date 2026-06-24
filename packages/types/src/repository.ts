// =============================================================================
// ShipFlow AI — Shared Repository Type Definitions
// =============================================================================

export interface RepositoryHealthMetrics {
  fileCount: number;
  typescriptCoverage: number; // 0-100 percentage of TS files
  testCoverage: number; // target/estimated percentage
  outdatedDependenciesCount: number;
  lintErrorEstimate: number;
  documentationScore: number; // 0-100
}

export interface RepositoryCapability {
  name: string;
  supported: boolean;
  description: string;
  missingDetails?: string;
}

export interface DetectedModule {
  name: string;
  path: string;
  description: string;
}

export interface DirectoryMapEntry {
  path: string;
  purpose: string;
}

export interface EntryPoint {
  path: string;
  description: string;
}

export interface RepositoryCapabilityReport {
  existingCapabilities: string[];
  missingCapabilities: string[];
  gapAnalysis: string;
}

export interface DependencyGraphEdge {
  from: string;
  to: string;
}

export interface MajorEntryPoints {
  frontendEntry: string;
  backendEntry: string;
  middlewareChain: string;
  apiLayer: string;
  databaseLayer: string;
}

export interface RepositoryAnalysis {
  summary: string;
  healthMetrics: RepositoryHealthMetrics;
  importantEntryPoints: EntryPoint[];
  repositoryCapabilities: RepositoryCapability[];
  detectedModules: DetectedModule[];
  directoryMap: DirectoryMapEntry[];
  architectureSummary: string;
  capabilityReport: RepositoryCapabilityReport;
  dependencyGraph: DependencyGraphEdge[];
  majorEntryPoints: MajorEntryPoints;
}

export interface RepositoryMemory {
  technologyStack: {
    framework: string;
    packageManager: string;
    languages: string[];
    ciProvider: string;
    dockerSupport: boolean;
    deploymentPlatform: string;
    configFiles: string[];
  };
  detectedModules: DetectedModule[];
  directoryMap: DirectoryMapEntry[];
  repositoryCapabilities: RepositoryCapability[];
  importantEntryPoints: EntryPoint[];
  repositoryHealthMetrics: RepositoryHealthMetrics;
  dependencyGraph: DependencyGraphEdge[];
  majorEntryPoints: MajorEntryPoints;
  summary: string;
  architectureSummary: string;
  capabilityReport: RepositoryCapabilityReport;
}

export interface RankedArea {
  affectedModule: string;
  affectedDirectory: string;
  affectedFiles: string[];
  confidence: number;
  reasoning: string;
}

export interface RepositorySearchResponse {
  featureId?: string;
  query: string;
  rankedAreas: RankedArea[];
}
