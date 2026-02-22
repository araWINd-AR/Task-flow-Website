import React, { useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

export default function Layout() {
  const { pathname } = useLocation();
  const pageRef = useRef(null);

  // ✅ Scroll the REAL scroll container to top on every route change.
  // The app uses an internal scroller (.pageWrap). Window scrolling is disabled by CSS.
  useLayoutEffect(() => {
    // Fallback: if something else made the window scrollable, reset it too.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    const el = pageRef.current || document.querySelector(".pageWrap");
    if (el) {
      el.scrollTop = 0;
      try {
        el.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } catch {}
    }
  }, [pathname]);

  return (
    <div className="appShell">
      <Sidebar />
      <div className="appMain">
        <TopBar />
        <div className="pageWrap" ref={pageRef}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
