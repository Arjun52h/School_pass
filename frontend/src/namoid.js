import { createNamoIDClient } from "@namoidhq/js";

export const namoid = createNamoIDClient({
  clientId: import.meta.env.VITE_NAMOID_CLIENT_ID,
});