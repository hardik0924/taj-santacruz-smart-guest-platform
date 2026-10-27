import { Outlet } from "react-router-dom";
import { ProductFooter } from "@/components/ProductFooter";
export function MusicianLayout() {
  return (
    <div className="product-page-shell musician-live-shell">
      <div className="musician-centered-content product-page-content">
        <Outlet />
      </div>
      <ProductFooter />
    </div>
  );
}
