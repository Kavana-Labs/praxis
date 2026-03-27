
import Logo, { LogoText } from "@/components/Logo.tsx";
import { Link } from "react-router-dom";
import { ROUTES } from "@/router/paths";

const Header = () => {
    return <header className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-700">
        <nav className="bg-white border-gray-200 dark:bg-gray-800">
            <div className="flex flex-wrap justify-between items-center px-8 py-5 mx-auto">
                <Link to={ROUTES.home}>
                    <Logo className="inline-block" /> <LogoText className="inline-block" />
                </Link>
                <div className="flex items-center lg:order-2">
                    <Link
                        to={ROUTES.login}
                        className="text-gray-800 dark:text-white hover:bg-gray-50 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-3 py-2.5 text-center mr-2 md:mr-2 transition-colors duration-200"
                    >
                        Login
                    </Link>
                    <a
                        href={"#"}
                        className="text-white bg-[linear-gradient(90deg,#5B16E1_0%,#805DF7_100%)] hover:bg-primary/80 focus:ring-4 focus:outline-none focus:ring-primary rounded-lg text-sm px-5 py-2.5 text-center transition-transform duration-200 ease-out active:scale-[0.98]"
                    >
                        Sign up
                    </a>
                    <button data-collapse-toggle="mobile-menu-2" type="button" className="inline-flex items-center p-2 ml-1 text-sm text-gray-500 rounded-lg lg:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600 transition-colors duration-200" aria-controls="mobile-menu-2" aria-expanded="false">  
                        <span className="sr-only">Open main menu</span>
                        <svg className="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path></svg>
                    </button>
                </div>
                <div className="hidden justify-between items-center w-full lg:flex lg:w-auto lg:order-1" id="mobile-menu-2">
                    <ul className="flex flex-col mt-4 font-medium lg:flex-row lg:space-x-8 lg:mt-0"> 
                        <li><a className="block py-2 pl-3 pr-4 text-gray-500 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent transition-colors duration-200" href={"#templates"}>Templates</a></li>
                        <li><a className="block py-2 pl-3 pr-4 text-gray-500 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent transition-colors duration-200" href={"#pricing"}>Pricing</a></li>
                        <li><a className="block py-2 pl-3 pr-4 text-gray-500 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent transition-colors duration-200" href={"#faqs"}>FAQ</a></li>
                    </ul>
                </div>
            </div>
        </nav>
    </header>
}

export default Header
