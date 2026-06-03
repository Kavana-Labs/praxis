import Logo from "../../components/Logo";
import KavanaLogo from "@/assets/kavana-labs-logo.svg";


const Footer = () => {
    return (
      <footer className="w-full border-t border-[#E5E7EB] bg-[#F7F7F8]">
        <div className="mx-auto max-w-[1440px] px-6 py-6 sm:px-[48px]">
          <div className="flex flex-col items-center gap-5 text-center md:flex-row md:justify-between md:gap-4 md:text-left">

            {/* Left: Praxis logo */}
            <div className="flex items-center gap-3">
                <Logo />
              <span className="text-[18px] font-semibold text-[#1F2937]">
                Praxis
              </span>
            </div>

            {/* Center: Kavana Labs trademark */}
            <div className="flex flex-col items-center gap-2 text-[14px] text-[#6B7280] sm:flex-row sm:gap-3">
              <img src={KavanaLogo} alt="Kavana Labs" />
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
