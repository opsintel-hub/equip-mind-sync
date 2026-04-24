import { inventoryUAT } from "./inventory";
import { directShippingUAT } from "./directShipping";
import { billboardUAT } from "./billboard";
import { mediaPlayerUAT } from "./mediaPlayer";
import { adManagementUAT } from "./adManagement";
import { toolsReportsAdminUAT } from "./toolsReportsAdmin";
import { edgeCasesUAT } from "./edgeCases";
import { searchVerificationUAT } from "./searchVerification";
import type { UATModule } from "./types";

export const allUATModules: UATModule[] = [
  inventoryUAT,
  directShippingUAT,
  billboardUAT,
  mediaPlayerUAT,
  adManagementUAT,
  toolsReportsAdminUAT,
  edgeCasesUAT,
  searchVerificationUAT,
];

export type { UATCase, UATModule, UATStep } from "./types";
