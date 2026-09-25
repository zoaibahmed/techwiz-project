import { lazy, Suspense, Component } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout, Guard } from "./app/Layout";
import { Feedback } from "./components/ui";
import { VisitorProvider } from "./data/visitor-context";
import { LocationModal } from "./components/LocationModal";
import { fixtureEnabled } from "./data/gateway";
import {
  Home,
  Markets,
  MarketDetail,
  Farmers,
  FarmerDetail,
  Products,
  ProductDetail,
  Auth,
  Info,
  NotFound,
} from "./features/Public";
import {
  CustomerHome,
  Planner,
  Basket,
  Orders,
  OrderDetail,
  Favourites,
  Notifications,
  Profile,
} from "./features/Customer";
const FarmerPage = lazy(() =>
  import("./features/Farmer").then((m) => ({ default: m.FarmerPage })),
);
const AdminPage = lazy(() =>
  import("./features/Admin").then((m) => ({ default: m.AdminPage })),
);
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="container section">
        <h1>The market needs a moment.</h1>
        <p>
          A display error occurred. Reload to reset this in-memory development
          preview.
        </p>
        <button className="button" onClick={() => window.location.reload()}>
          Reload preview
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export function App() {
  if (!fixtureEnabled)
    return (
      <main className="container section">
        <h1>Gather & Grow integration is not configured.</h1>
        <p>
          The approved live API adapter is pending. This production build does
          not silently substitute fictional records.
        </p>
        <p>Use the documented demo build for a clearly labelled showcase.</p>
      </main>
    );
  return (
    <ErrorBoundary>
      <VisitorProvider>
        <BrowserRouter>
          <Feedback>
            <LocationModal />
            <Suspense
            fallback={
              <main className="container section" role="status">
                Opening your market workspace…
              </main>
            }
          >
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="markets" element={<Markets />} />
                <Route path="markets/:marketId" element={<MarketDetail />} />
                <Route path="farmers" element={<Farmers />} />
                <Route path="farmers/:farmerId" element={<FarmerDetail />} />
                <Route path="products" element={<Products />} />
                <Route path="products/:productId" element={<ProductDetail />} />
                {["about", "contact", "help"].map((path) => (
                  <Route key={path} path={path} element={<Info />} />
                ))}
                {[
                  "login",
                  "admin/login",
                  "register",
                  "register/customer",
                  "register/farmer",
                ].map((path) => (
                  <Route key={path} path={path} element={<Auth key={path} />} />
                ))}
                <Route path="basket" element={<Basket />} />
                <Route path="checkout" element={<Basket />} />
                <Route element={<Guard role="customer" />}>
                  <Route path="customer" element={<CustomerHome />} />
                  <Route path="customer/market-day" element={<Planner />} />
                  <Route path="customer/orders" element={<Orders />} />
                  {[
                    "customer/orders/:orderId",
                    "customer/orders/:orderId/edit",
                    "customer/orders/:orderId/review",
                  ].map((path) => (
                    <Route key={path} path={path} element={<OrderDetail />} />
                  ))}
                  <Route path="customer/favourites" element={<Favourites />} />
                  <Route
                    path="customer/notifications"
                    element={<Notifications />}
                  />
                  <Route path="customer/profile" element={<Profile />} />
                </Route>
                <Route element={<Guard role="farmer" />}>
                  <Route path="farmer" element={<FarmerPage />} />
                  <Route path="farmer/:section" element={<FarmerPage />} />
                  <Route path="farmer/products/new" element={<FarmerPage />} />
                  <Route
                    path="farmer/products/:productId/edit"
                    element={<FarmerPage />}
                  />
                  <Route
                    path="farmer/orders/:orderId"
                    element={<FarmerPage />}
                  />
                </Route>
                <Route element={<Guard role="admin" />}>
                  <Route path="admin" element={<AdminPage />} />
                  <Route path="admin/:section" element={<AdminPage />} />
                  <Route
                    path="admin/farmers/:farmerId"
                    element={<AdminPage />}
                  />
                  <Route
                    path="admin/customers/:customerId"
                    element={<AdminPage />}
                  />
                  <Route path="admin/markets/new" element={<AdminPage />} />
                  <Route
                    path="admin/markets/:marketId/edit"
                    element={<AdminPage />}
                  />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </Feedback>
      </BrowserRouter>
    </VisitorProvider>
  </ErrorBoundary>
  );
}
