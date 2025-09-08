import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading } from "@medusajs/ui"

const OrderInsights = () => {
  return (
    <Container>
      <Heading level="h3">Order Insights</Heading>
      <p>Custom order analytics widget</p>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default OrderInsights
