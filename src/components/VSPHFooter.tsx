import HalftoneWordmarkFooter from "./HalftoneWordmarkFooter";

/** Supplied interactive wordmark, paired with the existing site footer. */
export function VSPHFooter() {
  return (
    <div className="vsph-footer">
      <HalftoneWordmarkFooter
        wordmark="VSPH"
        label="VSPH"
        meta="Live music. Memorable evenings."
        columns={[]}
        palette={{ background: "#f5f5f7", ink: "#1d1d1f", warm: "#0066cc" }}
        fontFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        monoFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        height="clamp(260px, 35vw, 500px)"
        crop={0.15}
        grain={0.15}
      />
    </div>
  );
}
