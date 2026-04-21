export interface AddrRecord {
  id: string;
  civic: number;
  street: string;
  unit?: string;
  postalCode: string;
  pollDiv: string;      // "PD-L1N" from FSA until poll boundaries loaded
  daCode: string;       // from DisseminationArea spatial join
  lat: number;
  lng: number;
  households: number;
  daMedianIncome: number;
  daMedianAge: number;
  daLangPrimary: string;
}

export type AddressSource = "osm" | "mpac" | "statcan";

export interface GeneratePrelistRequest {
  municipality: string;
  source: AddressSource;
  postalFrom?: string;
  postalTo?: string;
  campaignId?: string;
}
