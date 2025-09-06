import React from "react";
import LogoInegi from "../assets/Logo_INEGI_a.svg";

const Navbar: React.FC = () => (
    <nav className="w-full bg-[#ffffff] text-white py-4 px-8 flex items-center justify-between shadow-md fixed top-0 left-0 z-50">
        <div className="flex items-center gap-2">
            <img src={LogoInegi} alt="INEGI Logo" className="h-16" />
            <span className="text-xl font-bold tracking-wide">INEGI Formularios</span>
        </div>
        <div>
            {/* Puedes agregar más enlaces o botones aquí */}
            <span className="text-sm">Bienvenido</span>
        </div>
    </nav>
);

export default Navbar;