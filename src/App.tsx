import { useState } from "react";
import { MobileRuntime } from "./mobile";
import { MobileDeviceProvider } from "./mobile/Device";
import { KeyboardProvider } from "./mobile/Keyboard";
import Prototype from "./Prototype";

export default function App() {
  const mobileQaMode = window.location.pathname === "/mobile-qa";
  const [viewMode, setViewMode] = useState<"mobile" | "web">("mobile");
  const showMobilePreview = mobileQaMode || viewMode === "mobile";

  return (
    <div className="preview-root" data-view-mode={showMobilePreview ? "mobile" : "web"}>
      {!mobileQaMode ? (
        <button
          className="view-mode-switch"
          type="button"
          aria-label={showMobilePreview ? "切换到网页版本" : "切换到 iPhone 版本"}
          onClick={() => setViewMode(showMobilePreview ? "web" : "mobile")}
        >
          {showMobilePreview ? "网页版本" : "iPhone 版本"}
        </button>
      ) : null}

      {showMobilePreview ? (
        <MobileRuntime><Prototype framedPreview /></MobileRuntime>
      ) : (
        <MobileDeviceProvider>
          <KeyboardProvider><Prototype /></KeyboardProvider>
        </MobileDeviceProvider>
      )}
    </div>
  );
}
