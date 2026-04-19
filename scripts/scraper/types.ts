export interface RawCandidate {
  candidateName: string;
  office: string;
  ward: string | null;
  wardNumber: number | null;
  municipality: string;
  province: string;
  electionYear: number;
  rawData: Record<string, unknown>;
}

export interface CkanPackage {
  id: string;
  name: string;
  title: string;
  resources: CkanResource[];
}

export interface CkanResource {
  id: string;
  name: string;
  format: string;
  url: string;
}

export interface CkanApiResponse<T> {
  success: boolean;
  result: T;
  error?: { message: string };
}
