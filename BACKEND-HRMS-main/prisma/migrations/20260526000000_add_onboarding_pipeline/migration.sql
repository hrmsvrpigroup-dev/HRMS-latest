-- CreateTable
CREATE TABLE "OnboardingInvite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiryAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "personalEmail" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "department" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "workLocation" TEXT,
    "onboardingData" JSONB,
    "submittedAt" TIMESTAMP(3),
    "workEmail" TEXT,
    "username" TEXT,
    "employeeId" TEXT,
    "employeeUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewComment" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingVerification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "verifierRole" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingStatusLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "previousStatus" TEXT,
    "nextStatus" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCredentialsAudit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeUserId" TEXT,
    "employeeCode" TEXT NOT NULL,
    "loginEmail" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "temporaryPasswordHash" TEXT NOT NULL,
    "tempPasswordIssuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tempPasswordExpiresAt" TIMESTAMP(3),
    "passwordResetRequired" BOOLEAN NOT NULL DEFAULT true,
    "firstLoginCompleted" BOOLEAN NOT NULL DEFAULT false,
    "issuedById" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeCredentialsAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingInvite_token_key" ON "OnboardingInvite"("token");

-- CreateIndex
CREATE INDEX "OnboardingInvite_tenantId_status_idx" ON "OnboardingInvite"("tenantId", "status");

-- CreateIndex
CREATE INDEX "OnboardingInvite_tenantId_personalEmail_idx" ON "OnboardingInvite"("tenantId", "personalEmail");

-- CreateIndex
CREATE INDEX "OnboardingInvite_tenantId_createdById_idx" ON "OnboardingInvite"("tenantId", "createdById");

-- CreateIndex
CREATE INDEX "OnboardingDocument_tenantId_inviteId_idx" ON "OnboardingDocument"("tenantId", "inviteId");

-- CreateIndex
CREATE INDEX "OnboardingDocument_tenantId_status_idx" ON "OnboardingDocument"("tenantId", "status");

-- CreateIndex
CREATE INDEX "OnboardingVerification_tenantId_inviteId_idx" ON "OnboardingVerification"("tenantId", "inviteId");

-- CreateIndex
CREATE INDEX "OnboardingVerification_tenantId_decision_idx" ON "OnboardingVerification"("tenantId", "decision");

-- CreateIndex
CREATE INDEX "OnboardingStatusLog_tenantId_inviteId_idx" ON "OnboardingStatusLog"("tenantId", "inviteId");

-- CreateIndex
CREATE INDEX "OnboardingStatusLog_tenantId_nextStatus_idx" ON "OnboardingStatusLog"("tenantId", "nextStatus");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeCredentialsAudit_inviteId_key" ON "EmployeeCredentialsAudit"("inviteId");

-- CreateIndex
CREATE INDEX "EmployeeCredentialsAudit_tenantId_loginEmail_idx" ON "EmployeeCredentialsAudit"("tenantId", "loginEmail");

-- CreateIndex
CREATE INDEX "EmployeeCredentialsAudit_tenantId_username_idx" ON "EmployeeCredentialsAudit"("tenantId", "username");

-- AddForeignKey
ALTER TABLE "OnboardingInvite" ADD CONSTRAINT "OnboardingInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingInvite" ADD CONSTRAINT "OnboardingInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "OnboardingInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingVerification" ADD CONSTRAINT "OnboardingVerification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingVerification" ADD CONSTRAINT "OnboardingVerification_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "OnboardingInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingVerification" ADD CONSTRAINT "OnboardingVerification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "OnboardingDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingVerification" ADD CONSTRAINT "OnboardingVerification_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStatusLog" ADD CONSTRAINT "OnboardingStatusLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStatusLog" ADD CONSTRAINT "OnboardingStatusLog_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "OnboardingInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStatusLog" ADD CONSTRAINT "OnboardingStatusLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCredentialsAudit" ADD CONSTRAINT "EmployeeCredentialsAudit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCredentialsAudit" ADD CONSTRAINT "EmployeeCredentialsAudit_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "OnboardingInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCredentialsAudit" ADD CONSTRAINT "EmployeeCredentialsAudit_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCredentialsAudit" ADD CONSTRAINT "EmployeeCredentialsAudit_employeeUserId_fkey" FOREIGN KEY ("employeeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCredentialsAudit" ADD CONSTRAINT "EmployeeCredentialsAudit_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
