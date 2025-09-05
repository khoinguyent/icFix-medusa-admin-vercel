import { AdminPostStockLocationsReq } from "@medusajs/medusa"
import { useMutation } from "@tanstack/react-query"
import medusaRequest from "../services/request"

export const useAdminUpdateStockLocation = (locationId: string) => {
  return useMutation<unknown, Error, AdminPostStockLocationsReq>(async (payload) => {
    const res = await medusaRequest(
      "POST",
      `/admin/stock-locations/${locationId}`,
      payload
    )
    return res.data
  })
}


