import { useMutation } from "@tanstack/react-query"
import medusaRequest from "../services/request"

type AssocPayload = { sales_channel_id: string; location_id: string }

export const useAdminAddLocationToSalesChannel = () => {
  return useMutation<unknown, Error, AssocPayload>(async (payload) => {
    const { location_id, sales_channel_id } = payload
    const res = await medusaRequest(
      "POST",
      `/admin/stock-locations/${location_id}/sales-channels`,
      { sales_channel_id }
    )
    return res.data
  })
}

export const useAdminRemoveLocationFromSalesChannel = () => {
  return useMutation<unknown, Error, AssocPayload>(async (payload) => {
    const { location_id, sales_channel_id } = payload
    const res = await medusaRequest(
      "DELETE",
      `/admin/stock-locations/${location_id}/sales-channels/${sales_channel_id}`
    )
    return res.data
  })
}


