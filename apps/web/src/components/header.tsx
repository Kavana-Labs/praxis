import { useState } from "react";
import Logo, { LogoText } from "@/components/Logo.tsx";

const NAV_LINKS = [
  { label: "Templates", href: "#templates" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faqs" },
];

const Header = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-700">
      <nav className="border-gray-200 bg-white">
        <div className="mx-auto flex flex-wrap items-center justify-between px-4 py-4 sm:px-8 sm:py-5">
          <a href="/" className="flex items-center">
            <Logo className="inline-block" /> <LogoText className="ml-1 inline-block" />
          </a>

          <div className="flex items-center lg:order-2">
            <a
              href="#"
              className="mr-1 rounded-lg px-3 py-2.5 text-center text-sm font-medium text-gray-800 transition-colors duration-200 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-blue-300 sm:mr-2"
            >
              Login
            </a>
            <a
              href="/editor"
              className="rounded-lg bg-[linear-gradient(90deg,#5B16E1_0%,#805DF7_100%)] px-4 py-2.5 text-center text-sm text-white transition-transform duration-200 ease-out hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-primary active:scale-[0.98] sm:px-5"
            >
              Sign up
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-controls="mobile-menu"
              aria-expanded={open}
              className="ml-1 inline-flex items-center rounded-lg p-2 text-sm text-gray-500 transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 lg:hidden"
            >
              <span className="sr-only">Toggle main menu</span>
              <svg className="h-6 w-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div
            className={`${open ? "block" : "hidden"} w-full lg:order-1 lg:flex lg:w-auto`}
            id="mobile-menu"
          >
            <ul className="mt-4 flex flex-col font-medium lg:mt-0 lg:flex-row lg:space-x-8">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    className="block rounded py-2 pl-3 pr-4 text-gray-500 transition-colors duration-200 hover:bg-gray-100 lg:p-0 lg:hover:bg-transparent lg:hover:text-[#652FF3]"
                    href={link.href}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
