import { useQuery } from "@tanstack/react-query"
import medusaRequest from "../services/request"

type ListResponse = { stock_locations: any[] }

export const useAdminStockLocations = (params?: Record<string, any>) => {
  const search = params
    ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
    : ""
  return useQuery(["admin-stock-locations", params], async () => {
    const res = await medusaRequest("GET", `/admin/stock-locations${search}`)
    return res.data as ListResponse
  }, {
    select: (data: ListResponse) => ({
      stock_locations: data.stock_locations,
      isLoading: false,
    }) as any,
  })
}


