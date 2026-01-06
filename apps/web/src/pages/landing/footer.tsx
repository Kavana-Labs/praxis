import Logo from "../../components/Logo";
import KavanaLogo from "@/assets/kavana-labs-logo.svg";


const Footer = () => {
    return (
      <footer className="w-full bg-[#F7F7F8] border-t border-[#E5E7EB]">
        <div className="max-w-[1440px] mx-auto px-[48px] py-[24px]">
          <div className="flex items-center justify-between">
  
            {/* Left: Praxis logo */}
            <div className="flex items-center gap-3">
                <Logo />
              <span className="text-[18px] font-semibold text-[#1F2937]">
                Praxis
              </span>
            </div>
  
            {/* Center: Kavana Labs trademark */}
            <div className="flex items-center gap-3 text-[#6B7280] text-[14px]">
              <img
                src={KavanaLogo}
                alt="Kavana Labs"
              />
              <span>
                Praxis™ is a trademark of Kavana Labs. Built for STEM.
              </span>
            </div>
  
            {/* Right: copyright */}
            <div className="text-[14px] text-[#9CA3AF]">
              © 2025 Praxis™. All rights reserved.
            </div>
  
          </div>
        </div>
      </footer>
    );
  };
  
  export default Footer;
  