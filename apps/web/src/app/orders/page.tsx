import { OrdersPageClient } from "@/components/orders/orders-page-client";
import { loadAllOrders, loadAllFills, loadStrategies } from "@/lib/api";

export default async function OrdersPage() {
  const [orders, fills, strategies] = await Promise.all([
    loadAllOrders(),
    loadAllFills(),
    loadStrategies(),
  ]);

  return <OrdersPageClient orders={orders} fills={fills} strategies={strategies} />;
}
