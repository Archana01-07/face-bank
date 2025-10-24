export type CustomerCategory = "HNW" | "Elderly" | "VIP" | "Regular";

export type BehaviorType = "Happy" | "Irate" | "Cautious" | "Neutral" | "Anxious";

export interface Behavior {
  type: BehaviorType;
  context: string;
  timestamp: string;
}

export interface Visit {
  date: string;
  purpose: string;
  outcome: string;
  staffNotes: string;
}

export interface CurrentVisit {
  purpose: string;
  expectedOutcome: string;
  staffNotes: string;
}

export interface FaceDescriptors {
  webcam?: Float32Array | number[];
  uploadedImage?: Float32Array | number[];
}

export interface Customer {
  id: string;
  fullName: string;
  accountNumber: string;
  phone: string;
  email: string;
  tags: CustomerCategory[];
  faceDescriptors: FaceDescriptors;
  behavior: Behavior[];
  currentVisit?: CurrentVisit;
  visitHistory: Visit[];
  registeredAt: string;
}
