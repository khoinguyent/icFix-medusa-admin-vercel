import { AdminPostStockLocationsReq, StockLocationDTO } from "@medusajs/medusa"
import { useMutation } from "@tanstack/react-query"
import medusaRequest from "../services/request"

type CreateStockLocationRequest = AdminPostStockLocationsReq
type CreateStockLocationResponse = { stock_location: StockLocationDTO }

export const useAdminCreateStockLocation = () => {
  return useMutation<CreateStockLocationResponse, Error, CreateStockLocationRequest>(
    async (payload) => {
      const res = await medusaRequest("POST", "/admin/stock-locations", payload)
      return res.data as CreateStockLocationResponse
    }
  )
}


