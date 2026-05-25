import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
export default function AppLayout() {
    return (_jsxs("div", { className: "flex min-h-screen bg-slate-900", children: [_jsx(Sidebar, {}), _jsxs("div", { className: "flex flex-col flex-1", children: [_jsx(MobileNav, {}), _jsx("main", { className: "flex-1 bg-white text-slate-900 overflow-y-auto min-h-screen pt-[88px] md:pt-0", children: _jsx(Outlet, {}) })] })] }));
}
