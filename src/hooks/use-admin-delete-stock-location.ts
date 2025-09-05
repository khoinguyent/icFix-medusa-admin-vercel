import { useMutation } from "@tanstack/react-query"
import medusaRequest from "../services/request"

export const useAdminDeleteStockLocation = (locationId: string) => {
  return useMutation(async () => {
    const res = await medusaRequest(
      "DELETE",
      `/admin/stock-locations/${locationId}`
    )
    return res.data
  })
}


