export type Step = "details-tech-1" | "details-tech-2" | "details-tech-3" | "details-comp-1" | "details-comp-2" | "verify-required" | "waiting" | "approved"

export interface SignupFormData {
  phone: string;
  // Technician Data
  name: string;
  dob: string;
  gender: string;
  address: string;
  experience: string;
  experienceLevel: string;
  skills: string[];
  primarySkill: string;
  // Documents
  aadharFront: string;
  aadharBack: string;
  panCard: string;
  resume: string;
  photo: string;
  // Bank Details
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upi: string;
  // Company Data
  companyName: string;
  industry: string;
  gst: string;
  email: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}
