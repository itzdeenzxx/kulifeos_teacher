export type TeacherVerificationStatus = "trusted-ku" | "verified-non-ku" | "unverified-non-ku";

export interface TeacherPolicyInput {
  isTeacherVerified?: boolean;
  verificationStatus?: TeacherVerificationStatus;
  isGuest?: boolean;
}

export interface TeacherPolicyResult {
  isGuest: boolean;
  isVerified: boolean;
  canPublishAssignments: boolean;
  canGenerateGroups: boolean;
  verificationStatus: TeacherVerificationStatus;
}

export const VERIFIED_TEACHER_STATUSES: TeacherVerificationStatus[] = ["trusted-ku", "verified-non-ku"];

function normalizeVerificationStatus(input?: TeacherVerificationStatus): TeacherVerificationStatus {
  if (input === "trusted-ku" || input === "verified-non-ku" || input === "unverified-non-ku") {
    return input;
  }
  return "unverified-non-ku";
}

export function evaluateTeacherPolicy(input: TeacherPolicyInput | null | undefined): TeacherPolicyResult {
  const status = normalizeVerificationStatus(input?.verificationStatus);
  const isGuest = !!input?.isGuest;
  const isVerified = isGuest || !!input?.isTeacherVerified || VERIFIED_TEACHER_STATUSES.includes(status);

  return {
    isGuest,
    isVerified,
    canPublishAssignments: isVerified,
    canGenerateGroups: isVerified,
    verificationStatus: status,
  };
}
