-- RecoAlgoConfig, history, impression logs
CREATE TABLE "RecoAlgoConfig" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'HYBRID',
    "hybridFillEnabled" BOOLEAN NOT NULL DEFAULT true,
    "collabFilterEnabled" BOOLEAN NOT NULL DEFAULT true,
    "contentBasedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weightHybridFill" INTEGER NOT NULL DEFAULT 34,
    "weightCollabFilter" INTEGER NOT NULL DEFAULT 33,
    "weightContentBased" INTEGER NOT NULL DEFAULT 33,
    "activationMinHybrid" INTEGER NOT NULL DEFAULT 5,
    "activationMinCollab" INTEGER NOT NULL DEFAULT 5,
    "activationMinContent" INTEGER NOT NULL DEFAULT 5,
    "thresholdCollabMinOrders" INTEGER NOT NULL DEFAULT 50,
    "thresholdContentMinTagged" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoAlgoConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "RecoAlgoConfig" ("id", "mode", "updatedAt")
VALUES ('default', 'HYBRID', NOW());

CREATE TABLE "RecoAlgoConfigHistory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" TEXT,
    "adminEmail" TEXT,
    "summary" TEXT NOT NULL,
    "oldMode" TEXT,
    "newMode" TEXT,
    "detailsJson" TEXT,

    CONSTRAINT "RecoAlgoConfigHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AlgoImpressionLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "placement" TEXT NOT NULL,
    "userId" TEXT,
    "sessionKey" TEXT,
    "payloadJson" TEXT NOT NULL,

    CONSTRAINT "AlgoImpressionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AlgoImpressionLog_createdAt_idx" ON "AlgoImpressionLog"("createdAt");
CREATE INDEX "AlgoImpressionLog_placement_createdAt_idx" ON "AlgoImpressionLog"("placement", "createdAt");
