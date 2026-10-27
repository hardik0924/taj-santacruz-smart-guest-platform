import { Outlet } from "react-router-dom";
import { ProductFooter } from "@/components/ProductFooter";
export function GuestLayout() {
  return (
    <div className="product-page-shell">
      <div className="product-page-content">
        <Outlet />
      </div>
      <ProductFooter />
    </div>
  );
}
